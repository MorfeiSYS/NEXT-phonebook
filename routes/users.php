<?php

function users(&$core, $params, $post_data)
{
	if(!$core->UserAuth->check_permission(0, PB_ACCESS_ADMIN))
	{
		$error_msg = LL('AccessDeniedToSection').' 0 '.LL('forUser').' '.$core->UserAuth->get_login().'!';
		include(TEMPLATES_DIR.'tpl.message.php');
		exit;
	}

	$core->db->select_assoc_ex($local_users, rpv('
		SELECT
			u.`id`,
			u.`login`,
			u.`mail`,
			u.`flags`,
			u.`role`
		FROM @users AS u
		WHERE
			(u.`flags` & ({%UA_LDAP} | {%UA_DELETED})) = 0
		ORDER BY u.`id`
	'));

	$core->db->select_assoc_ex($domain_users, rpv('
		SELECT
			u.`id`,
			u.`login`,
			u.`mail`,
			u.`flags`,
			u.`role`
		FROM @users AS u
		WHERE
			(u.`flags` & {%UA_LDAP}) = {%UA_LDAP}
			AND (u.`flags` & {%UA_DELETED}) = 0
		ORDER BY u.`id`
	'));

	$current_folder = array(
		'name' => LL('RootLevel'),
		'id' => 0,
		'pid' => '00000000-0000-0000-0000-000000000000',
		'guid' => '00000000-0000-0000-0000-000000000000',
		'flags' => 0,
		'childs' => NULL
	);

	$permissions = array();
	$core->db->select_assoc_ex($permissions, rpv('
		SELECT a.`id`, a.`oid`, a.`dn`, a.`allow_bits`
		FROM `@access` AS a
		WHERE a.`oid` = #
		ORDER BY a.`dn`', $current_folder['id']));

	$local_users = $local_users ? $local_users : array();
	$domain_users = $domain_users ? $domain_users : array();

	$users_stat_local = count($local_users);
	$users_stat_local_disabled = 0;
	foreach($local_users as &$row)
	{
		if(intval($row['flags']) & UA_DISABLED)
		{
			$users_stat_local_disabled++;
		}
	}
	unset($row);

	$users_stat_domain = count($domain_users);
	$users_stat_domain_operator = 0;
	foreach($domain_users as &$row)
	{
		if(intval(@$row['role']) >= PB_ROLE_OPERATOR)
		{
			$users_stat_domain_operator++;
		}
	}
	unset($row);

	$users_stat_permissions = count($permissions);

	include(TEMPLATES_DIR.'tpl.users.php');
}