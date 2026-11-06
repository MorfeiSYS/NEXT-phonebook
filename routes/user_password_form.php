<?php

function user_password_form(&$core, $params, $post_data)
{
	assert_permission_ajax(0, PB_ACCESS_ADMIN);

	$user_id = intval(@$params[1]);

	if(!$user_id)
	{
		echo '{"code": 1, "message": "'.LL('UserNotFound').'"}';
		return;
	}

	$user_info = $core->UserAuth->get_user_info_ex($user_id);
	if(!$user_info || ($user_info['flags'] & UA_LDAP) || ($user_info['flags'] & UA_DELETED))
	{
		echo '{"code": 1, "message": "'.LL('UserNotFound').'"}';
		return;
	}

	$result_json = array(
		'code' => 0,
		'message' => '',
		'title' => sprintf(LL('SetUserPasswordTitle'), $user_info['login']),
		'action' => 'user_password',
		'fields' => array(
			array(
				'type' => 'hidden',
				'name' => 'id',
				'value' => $user_id
			),
			array(
				'type' => 'password',
				'name' => 'new_password',
				'title' => LL('NewPassword').'*',
				'value' => ''
			),
			array(
				'type' => 'password',
				'name' => 'new_password2',
				'title' => LL('NewPasswordAgain').'*',
				'value' => ''
			),
		)
	);

	echo json_encode($result_json);
}
