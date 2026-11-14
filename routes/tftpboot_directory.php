<?php

function tftpboot_directory(&$core, $params, $post_data)
{
	$post_data = tftpboot_merge_post($post_data);
	assert_tftpboot_ajax($core);
	$svc = tftpboot_instance($core);
	$refresh = intval(@$post_data['refresh']);
	if($refresh)
	{
		$rows = tftpboot_directory_rows_from_map($svc->sync_name_map());
	}
	else
	{
		$rows = $svc->directory_rows();
	}

	tftpboot_json_send(array('code' => 0, 'rows' => $rows));
}
