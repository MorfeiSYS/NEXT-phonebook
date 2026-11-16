<?php

function tftpboot_layout_blueprint(&$core, $params, $post_data)
{
	$post_data = tftpboot_merge_post($post_data);
	assert_permission_ajax(0, PB_ACCESS_ADMIN);
	$vendor = isset($post_data['vendor']) ? trim((string)$post_data['vendor']) : '';
	$model = isset($post_data['model']) ? trim((string)$post_data['model']) : '';
	if($vendor === '' || $model === '')
	{
		tftpboot_json_send(array('code' => 1, 'message' => 'Invalid model'));
		exit;
	}
	$svc = tftpboot_instance($core);
	$bp = $svc->layout_blueprint_for_model($vendor, $model);
	tftpboot_json_send(array('code' => 0) + $bp);
}