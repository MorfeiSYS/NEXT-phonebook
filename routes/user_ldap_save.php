<?php

function user_ldap_save(&$core, $params, $post_data)
{
	$result_json = array(
		'code' => 0,
		'message' => '',
		'errors' => array()
	);

	assert_permission_ajax(0, PB_ACCESS_ADMIN);

	$user_id = intval(@$post_data['id']);
	$mail = @$post_data['mail'];
	$role = intval(@$post_data['role']);

	if($role < PB_ROLE_USER || $role > PB_ROLE_OPERATOR)
	{
		$role = PB_ROLE_USER;
	}

	if(empty($mail))
	{
		$result_json['code'] = 1;
		$result_json['errors'][] = array('name' => 'mail', 'msg' => LL('ThisFieldRequired'));
	}

	if($result_json['code'])
	{
		$result_json['message'] = LL('NotAllFilled');
	}
	elseif($core->UserAuth->set_user_ldap_info_ex($user_id, $mail, $role))
	{
		$info = $core->UserAuth->get_user_info_ex($user_id);
		log_db('Updated domain user', '{id='.$user_id.',role='.$role.'}', 0);
		$result_json['message'] = LL('SuccessfulUpdated');
		$result_json['id'] = $user_id;
		if($info)
		{
			$result_json['user'] = array(
				'id' => intval($info['id']),
				'login' => $info['login'],
				'mail' => $info['mail'],
				'role' => intval($info['role']),
				'role_label' => role_label($info['role']),
				'blocked' => (intval($info['flags']) & UA_DISABLED) ? 1 : 0,
				'is_new' => 0
			);
		}
	}
	else
	{
		$result_json['code'] = 1;
		$result_json['message'] = LL('Error').': '.$core->get_last_error();
	}

	echo json_encode($result_json, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
}