<?php

function tftpboot_rescan(&$core, $params, $post_data)
{
	$post_data = tftpboot_merge_post($post_data);
	assert_tftpboot_ajax($core);
	if(!user_is_admin())
	{
		tftpboot_json_send(array('code' => 1, 'message' => LL('AccessDenied')));
		exit;
	}

	$svc = tftpboot_instance($core);
	$svc->scan(TRUE);
	tftpboot_json_send(array('code' => 0, 'message' => LL('Save')));
}
