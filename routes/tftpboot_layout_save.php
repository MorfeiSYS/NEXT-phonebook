<?php

function tftpboot_layout_save(&$core, $params, $post_data)
{
	$post_data = tftpboot_merge_post($post_data);
	assert_permission_ajax(0, PB_ACCESS_ADMIN);
	$vendor = isset($post_data['vendor']) ? trim((string)$post_data['vendor']) : '';
	$model = isset($post_data['model']) ? trim((string)$post_data['model']) : '';
	$layout = isset($post_data['layout']) ? $post_data['layout'] : NULL;
	if(is_string($layout))
	{
		$layout = json_decode($layout, TRUE);
	}
	$svc = tftpboot_instance($core);
	tftpboot_json_send($svc->save_model_layout($vendor, $model, $layout));
}