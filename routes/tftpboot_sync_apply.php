<?php

function tftpboot_sync_apply(&$core, $params, $post_data)
{
	@ini_set('max_execution_time', '600');
	@set_time_limit(600);
	@ignore_user_abort(TRUE);
	if(function_exists('session_write_close'))
	{
		@session_write_close();
	}
	$post_data = tftpboot_merge_post($post_data);
	assert_tftpboot_ajax($core);
	$items = isset($post_data['items']) ? $post_data['items'] : array();
	if(!is_array($items))
	{
		tftpboot_json_send(array('code' => 1, 'message' => 'Invalid data'));
		exit;
	}

	$svc = tftpboot_instance($core);
	list($vendors, $explicit) = tftpboot_bulk_vendors_from_post($post_data, $svc);
	if(!count($vendors))
	{
		tftpboot_json_send(array('code' => 1, 'message' => LL('TftpBootBulkNoVendors')));
		exit;
	}

	$n = $svc->apply_sync_diff($items, $vendors);
	if($n > 0)
	{
		$undo_items = array();
		foreach($items as $item)
		{
			if(!empty($item['action']) && $item['action'] === 'delete')
			{
				continue;
			}

			$num = isset($item['old_number']) ? $item['old_number'] : (isset($item['number']) ? $item['number'] : '');
			$undo_items[] = array(
				'old_number' => $num,
				'old_title' => isset($item['title']) ? $item['title'] : '',
				'number' => $num,
				'title' => isset($item['old_title']) ? $item['old_title'] : '',
			);
		}

		tftpboot_sync_undo_save($core, array(
			'vendors' => $vendors,
			'items' => $undo_items,
			'ts' => time(),
		));
	}

	log_db('tftpboot sync apply', 'keys='.$n.';vendors='.implode(',', $vendors), 0);

	tftpboot_json_send(array(
		'code' => 0,
		'message' => LL('Save'),
		'applied' => $n,
		'keys' => $n,
		'has_undo' => $n > 0,
	));
}
