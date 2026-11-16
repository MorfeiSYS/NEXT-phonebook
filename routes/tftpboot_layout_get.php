<?php

function tftpboot_layout_get(&$core, $params, $post_data)
{
	$post_data = tftpboot_merge_post($post_data);
	assert_permission_ajax(0, PB_ACCESS_ADMIN);
	$svc = tftpboot_instance($core);
	tftpboot_json_send(array(
		'code' => 0,
		'vendors' => $svc->layout_models_for_admin(),
	));
}