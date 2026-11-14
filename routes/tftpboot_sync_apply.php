<?php

function tftpboot_sync_apply(&$core, $params, $post_data)
{
	$post_data = tftpboot_merge_post($post_data);
	assert_tftpboot_ajax($core);
	$items = isset($post_data['items']) ? $post_data['items'] : array();
	if(!is_array($items))
	{
		tftpboot_json_send(array('code' => 1, 'message' => 'Invalid data'));
		exit;
	}

	$policy = tftpboot_user_policy($core);
	$svc = tftpboot_instance($core);
	$n = $svc->apply_sync_diff($items, $policy);
	tftpboot_json_send(array('code' => 0, 'message' => LL('Save'), 'applied' => $n));
}
