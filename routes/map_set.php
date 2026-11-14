<?php

function map_set(&$core, $params, $post_data)
{
	global $g_maps_catalog;

	$id = intval(@$post_data['id']);

	assert_permission_ajax(0, PB_ACCESS_ADMIN);	// level 0 having Write access mean admin

	if(!$id)
	{
		echo '{"code": 1, "message": "Invalid identifier"}';
		exit;
	}

	if(!maps_catalog_map_exists($g_maps_catalog, $id))
	{
		echo '{"code": 1, "message": "Invalid map identifier"}';
		exit;
	}

	if(!file_exists(@$_FILES['file']['tmp_name']))
	{
		echo '{"code": 1, "message": "Invalid image"}';
		exit;
	}

	$s_photo = file_get_contents(@$_FILES['file']['tmp_name']);
	$src = imagecreatefromstring($s_photo);
	imagepng($src, ROOT_DIR.'photos'.DIRECTORY_SEPARATOR.'map'.$id.'.png');
	imagedestroy($src);

	log_db('Map image set', '{map_id='.$id.'}', 0);

	echo '{"code": 0, "id": '.$id.', "message": "Map image changed (ID '.$id.')"}';
}
