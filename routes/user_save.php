<?php

function user_save(&$core, $params, $post_data)
{
	$result_json = array(
		'code' => 0,
		'message' => '',
		'errors' => array()
	);

	assert_permission_ajax(0, PB_ACCESS_ADMIN);

	$user_id = intval(@$post_data['id']);
	$login = @$post_data['login'];
	$mail = @$post_data['mail'];
	$role = intval(@$post_data['role']);

	if($role < PB_ROLE_USER || $role > PB_ROLE_ADMIN)
	{
		$role = PB_ROLE_USER;
	}

	if(empty($login))
	{
		$result_json['code'] = 1;
		$result_json['errors'][] = array('name' => 'login', 'msg' => LL('ThisFieldRequired'));
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
	elseif($core->UserAuth->set_user_info_ex($user_id, $login, $mail, $role))
	{
		if(!$user_id)
		{
			$user_id = intval($core->db->last_id());
		}
		$info = $core->UserAuth->get_user_info_ex($user_id);
		log_db('Updated user', '{id='.$user_id.',login="'.$login.'",role='.$role.'}', 0);
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
				'is_new' => empty($post_data['id']) ? 1 : 0
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
