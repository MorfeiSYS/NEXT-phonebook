<?php

function contacts_columns_reset(&$core, $params, $post_data)
{
	$core->Config->delete_user('contacts_columns_json');

	echo json_encode(array(
		'code' => 0,
		'message' => LL('SuccessfulUpdated')
	), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
}
