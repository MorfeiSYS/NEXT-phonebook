<?php

function tftpboot_tree(&$core, $params, $post_data)
{
	$post_data = tftpboot_merge_post($post_data);
	assert_tftpboot_ajax($core);
	$svc = tftpboot_instance($core);
	tftpboot_json_send(array('code' => 0, 'tree' => $svc->get_tree()));
}
