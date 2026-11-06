<?php

function user_password(&$core, $params, $post_data)
{
	$result_json = array(
		'code' => 0,
		'message' => '',
		'errors' => array()
	);

	assert_permission_ajax(0, PB_ACCESS_ADMIN);

	$user_id = intval(@$post_data['id']);
	$new_password = @$post_data['new_password'];
	$new_password2 = @$post_data['new_password2'];

	$user_info = $user_id ? $core->UserAuth->get_user_info_ex($user_id) : FALSE;
	if(!$user_info || ($user_info['flags'] & UA_LDAP) || ($user_info['flags'] & UA_DELETED))
	{
		$result_json['code'] = 1;
		$result_json['message'] = LL('UserNotFound');
		echo json_encode($result_json, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
		return;
	}

	if(empty($new_password))
	{
		$result_json['code'] = 1;
		$result_json['errors'][] = array('name' => 'new_password', 'msg' => LL('ThisFieldRequired'));
	}

	if(empty($new_password2))
	{
		$result_json['code'] = 1;
		$result_json['errors'][] = array('name' => 'new_password2', 'msg' => LL('ThisFieldRequired'));
	}
	elseif(strcmp($new_password, $new_password2) !== 0)
	{
		$result_json['code'] = 1;
		$result_json['errors'][] = array('name' => 'new_password2', 'msg' => LL('PasswordsNotMatch'));
	}

	if($result_json['code'])
	{
		$result_json['message'] = LL('NotAllFilled');
	}
	elseif($core->UserAuth->change_password_admin_ex($user_id, $new_password))
	{
		log_db('Admin changed user password', '{id='.$user_id.'}', 0);
		$result_json['message'] = LL('PasswordChanged');
	}
	else
	{
		$result_json['code'] = 1;
		$result_json['message'] = LL('UnknownError');
	}

	echo json_encode($result_json, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
}
