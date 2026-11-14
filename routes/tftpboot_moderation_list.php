<?php

function tftpboot_moderation_list(&$core, $params, $post_data)
{
	assert_tftpboot_moderate_ajax($core);
	$svc = tftpboot_instance($core);
	$items = $svc->list_moderation_pending();
	tftpboot_json_send(array(
		'code' => 0,
		'items' => $items,
		'pending_count' => $svc->count_moderation_pending(),
	));
}