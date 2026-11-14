<?php

function tftpboot_sync_undo(&$core, $params, $post_data)
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
	$undo = tftpboot_sync_undo_load($core);
	if(!$undo)
	{
		tftpboot_json_send(array('code' => 1, 'message' => LL('TftpBootSyncUndoEmpty')));
		exit;
	}

	$svc = tftpboot_instance($core);
	$vendors = isset($undo['vendors']) && is_array($undo['vendors']) ? $undo['vendors'] : tftpboot_bulk_vendor_choices($svc);
	$items = isset($undo['items']) && is_array($undo['items']) ? $undo['items'] : array();
	$n = $svc->apply_sync_diff($items, $vendors);
	if($n > 0)
	{
		tftpboot_sync_undo_clear($core);
	}

	tftpboot_json_send(array('code' => 0, 'message' => LL('TftpBootSyncUndoDone'), 'keys' => $n, 'has_undo' => FALSE));
}