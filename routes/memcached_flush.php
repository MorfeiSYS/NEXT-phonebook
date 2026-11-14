<?php

function memcached_flush(&$core, $params, $post_data)
{
	assert_permission_ajax(0, PB_ACCESS_ADMIN);	// non-priveleged users cannot flush memcached

	if(defined('USE_MEMCACHED') && USE_MEMCACHED)
	{
		$core->Mem->flush();
		log_db('Flush memcached', '', 0);
		echo '{"code": 0, "message": "Cache cleared"}';
	}
	else
	{
		echo '{"code": 0, "message": "memcached is not configured"}';
	}
}
