<?php

function tftpboot_catalog_add_suggested(&$core, $params, $post_data)
{
	$post_data = tftpboot_merge_post($post_data);
	assert_permission_ajax(0, PB_ACCESS_ADMIN);

	$models = isset($post_data['models']) ? $post_data['models'] : array();
	if(!is_array($models))
	{
		tftpboot_json_send(array('code' => 1, 'message' => LL('NotAllFilled')));
		exit;
	}

	$svc = tftpboot_instance($core);
	$n = $svc->add_catalog_suggested_models($models);
	if($n < 1)
	{
		tftpboot_json_send(array('code' => 1, 'message' => LL('UnknownError')));
		exit;
	}

	log_db('tftpboot catalog add models', '{added='.$n.'}', 0);
	tftpboot_json_send(array(
		'code' => 0,
		'message' => LL('TftpBootCatalogModelsAdded').' ('.$n.')',
		'added' => $n,
	));
}