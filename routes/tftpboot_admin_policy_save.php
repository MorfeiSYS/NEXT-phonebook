<?php

function tftpboot_admin_policy_save(&$core, $params, $post_data)
{
	$post_data = tftpboot_merge_post($post_data);
	assert_permission_ajax(0, PB_ACCESS_ADMIN);
	$sid = isset($post_data['sid']) ? trim($post_data['sid']) : '';
	$dn = isset($post_data['dn']) ? trim($post_data['dn']) : '';
	$mode = isset($post_data['mode']) ? trim($post_data['mode']) : 'buttons_only';
	$sections = isset($post_data['sections']) ? $post_data['sections'] : array('dss');
	if(!is_array($sections))
	{
		$sections = array('dss');
	}

	if($dn !== '' && $sid === '' && defined('LDAP_USE_SID') && LDAP_USE_SID)
	{
		$records = array();
		if($core->LDAP->search($records, '(&(objectCategory=group)(distinguishedName='.ldap_escape($dn, '', LDAP_ESCAPE_FILTER).'))', array('objectSID')) == 1)
		{
			$sid = bin_to_str_sid($records[0]['objectSid'][0]);
		}
	}

	if($sid === '')
	{
		tftpboot_json_send(array('code' => 1, 'message' => LL('NotAllFilled')));
		exit;
	}

	$svc = tftpboot_instance($core);
	$svc->save_policy($sid, $dn, $mode, $sections);
	log_db('tftpboot policy save', 'sid='.$sid.';mode='.$mode, 0);
	tftpboot_json_send(array('code' => 0, 'message' => LL('Save')));
}
