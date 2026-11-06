<?php

function user_get(&$core, $params, $post_data)
{
	$user_id = intval(@$params[1]);

	assert_permission_ajax(0, PB_ACCESS_ADMIN);

	$login = '';
	$mail = '';
	$role = PB_ROLE_USER;

	if($user_id)
	{
		if(!$core->db->select_assoc_ex($user_info, rpv("SELECT u.`login`, u.`mail`, u.`role` FROM @users AS u WHERE u.`id` = # LIMIT 1", $user_id)))
		{
			echo '{"code": 1, "message": "Failed get permissions"}';
			return;
		}
		
		$login = @$user_info[0]['login'];
		$mail = @$user_info[0]['mail'];
		$role = intval(@$user_info[0]['role']);
	}

	$result_json = array(
		'code' => 0,
		'message' => '',
		'title' => LL('EditUser'),
		'action' => 'user_save',
		'fields' => array(
			array(
				'type' => 'hidden',
				'name' => 'id',
				'value' => $user_id
			),
			array(
				'type' => 'string',
				'name' => 'login',
				'title' => LL('Login').'*',
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
				'list' => array(LL('RoleUser'), LL('RoleOperator'), LL('RoleAdmin')),
				'values' => array(PB_ROLE_USER, PB_ROLE_OPERATOR, PB_ROLE_ADMIN)
			)
		)
	);

	echo json_encode($result_json);
}
