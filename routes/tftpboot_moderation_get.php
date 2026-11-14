<?php

function tftpboot_moderation_get(&$core, $params, $post_data)
{
	$post_data = tftpboot_merge_post($post_data);
	assert_tftpboot_moderate_ajax($core);
	$id = isset($post_data['id']) ? intval($post_data['id']) : 0;
	if($id <= 0)
	{
		tftpboot_json_send(array('code' => 1, 'message' => 'Invalid id'));
		exit;
	}

	$svc = tftpboot_instance($core);
	$row = $svc->get_moderation_request($id);
	if(!$row)
	{
		tftpboot_json_send(array('code' => 1, 'message' => 'Not found'));
		exit;
	}

	tftpboot_json_send(array('code' => 0, 'request' => $row));
}