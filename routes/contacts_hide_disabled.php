<?php

function contacts_hide_disabled(&$core, $params, $post_data)
{
	assert_permission_ajax(0, PB_ACCESS_ADMIN);	// level 0 having Write access mean admin

	$core->db->put(rpv('UPDATE `@contacts` SET `flags` = (`flags` | {%PB_CONTACT_LIST_HIDDEN}) WHERE (`flags` & ({%PB_CONTACT_AD_DELETED} | {%PB_CONTACT_AD_DISABLED}))'));

	log_db('Hide disabled contacts', '', 0);

	echo '{"code": 0, "message": "Hidded disabled and deleted contacts"}';
}
