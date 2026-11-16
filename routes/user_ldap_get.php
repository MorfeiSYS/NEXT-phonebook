<?php

function user_ldap_get(&$core, $params, $post_data)
{
	$user_id = intval(@$params[1]);

	assert_permission_ajax(0, PB_ACCESS_ADMIN);

	$login = '';
	$mail = '';
	$role = PB_ROLE_USER;
	$user_info = array();

	if($user_id)
	{
		if(!$core->db->select_assoc_ex($user_info, rpv("
			SELECT u.`login`, u.`mail`, u.`role`, u.`flags`
			FROM @users AS u
			WHERE
				u.`id` = #
				AND (u.`flags` & {%UA_LDAP}) = {%UA_LDAP}
				AND (u.`flags` & {%UA_DELETED}) = 0
			LIMIT 1", $user_id)))
		{
			echo '{"code": 1, "message": "Failed get user"}';
			return;
		}

		$login = @$user_info[0]['login'];
		$mail = @$user_info[0]['mail'];
		$role = intval(@$user_info[0]['role']);
		if($role > PB_ROLE_OPERATOR)
		{
			$role = PB_ROLE_OPERATOR;
		}
	}
	else
	{
		echo '{"code": 1, "message": "Failed get user"}';
		return;
	}

	$result_json = array(
		'code' => 0,
		'message' => '',
		'title' => LL('EditDomainUser'),
		'action' => 'user_ldap_save',
		'fields' => array(
			array(
				'type' => 'hidden',
				'name' => 'id',
				'value' => $user_id
			),
			array(
				'type' => 'readonly',
				'name' => 'login',
				'title' => LL('Login'),
				'value' => $login
			),
			array(
				'type' => 'string',
				'name' => 'mail',
				'title' => LL('Mail').'*',
				'value' => $mail,
				'autocomplete' => 'complete_mail'
			),
			array(
				'type' => 'list',
				'name' => 'role',
				'title' => LL('Role').'*',
				'value' => $role,
				'list' => array(LL('RoleUser'), LL('RoleOperator')),
				'values' => array(PB_ROLE_USER, PB_ROLE_OPERATOR)
			)
		)
	);

	echo json_encode($result_json);
}