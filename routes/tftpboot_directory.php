<?php

function tftpboot_directory(&$core, $params, $post_data)
{
	$post_data = tftpboot_merge_post($post_data);
	assert_tftpboot_ajax($core);
	$svc = tftpboot_instance($core);
	$refresh = intval(@$post_data['refresh']);
	if($refresh)
	{
		$rows = array();
		$map = $svc->sync_name_map();
		foreach($map as $num => $name)
		{
			if(!preg_match('/^\d+$/', (string)$num))
			{
				continue;
			}
			$rows[] = array('number' => $num, 'name' => $name);
		}
		usort($rows, function($a, $b) { return strcmp($a['number'], $b['number']); });
	}
	else
	{
		$rows = $svc->directory_rows();
	}

	tftpboot_json_send(array('code' => 0, 'rows' => $rows));
}
