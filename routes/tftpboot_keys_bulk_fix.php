<?php

function tftpboot_keys_bulk_fix(&$core, $params, $post_data)
{
	$post_data = tftpboot_merge_post($post_data);
	assert_tftpboot_ajax($core);
	$number = isset($post_data['number']) ? tftpboot_sanitize_speed_dial_number($post_data['number']) : '';
	$title = isset($post_data['title']) ? trim((string)$post_data['title']) : '';
	$fixed = !empty($post_data['fixed']);

	if($number === '')
	{
		tftpboot_json_send(array('code' => 1, 'message' => LL('TftpBootDialNumberRequired')));
		exit;
	}

	if(!$fixed && !user_can_tftpboot_bulk_unfix($core))
	{
		tftpboot_json_send(array('code' => 1, 'message' => LL('AccessDenied')));
		exit;
	}

	$svc = tftpboot_instance($core);
	if(!$svc->bulk_set_fixed($number, $title, $fixed))
	{
		tftpboot_json_send(array('code' => 1, 'message' => LL('Error')));
		exit;
	}

	$action = $fixed ? 'fix' : 'unfix';
	log_db('tftpboot bulk '.$action, $number.' '.$title, 0);
	tftpboot_json_send(array(
		'code' => 0,
		'message' => $fixed ? LL('TftpBootBulkFixedOn') : LL('TftpBootBulkFixedOff'),
		'fixed' => $fixed ? 1 : 0,
	));
}