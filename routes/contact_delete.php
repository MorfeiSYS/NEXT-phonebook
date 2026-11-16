<?php

function contact_delete(&$core, $params, $post_data)
{
	$id = intval(@$post_data['id']);

	assert_permission_ajax(0, PB_ACCESS_ADMIN);	// level 0 having Write access mean admin

	if(!$id)
	{
		echo json_encode(array('code' => 1, 'message' => 'Undefined contact id'), JSON_UNESCAPED_UNICODE);
		return;
	}

	$affected = 0;
	if(!$core->db->put(rpv('DELETE FROM `@contacts` WHERE `id` = # AND `adid` = \'\' LIMIT 1', $id), $affected)
		|| $affected < 1)
	{
		echo json_encode(array('code' => 1, 'message' => LL('ContactDeleteNotLocal')), JSON_UNESCAPED_UNICODE);
		return;
	}

	log_db('Deleted contact', '{id='.$id.'}', 0);

	$filename = ROOT_DIR.'photos'.DIRECTORY_SEPARATOR.'t'.$id.'.jpg';

	if(file_exists($filename))
	{
		unlink($filename);
	}

	echo json_encode(array('code' => 0, 'message' => LL('ContactDeleted').' (ID '.$id.')'), JSON_UNESCAPED_UNICODE);
}

