<?php

function tftpboot_moderation_pending(&$core, $params, $post_data)
{
	assert_tftpboot_moderate_ajax($core);
	$svc = tftpboot_instance($core);
	tftpboot_json_send(array(
		'code' => 0,
		'pending_count' => $svc->count_moderation_pending(),
	));
}