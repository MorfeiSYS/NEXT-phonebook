<?php

function contacts_reveal_admin_hidden(&$core, $params, $post_data)
{
	assert_permission_ajax(0, PB_ACCESS_ADMIN);	// level 0 having Write access mean admin

	$core->db->put(rpv('
		UPDATE `@contacts` SET
			`flags` = ((`flags` | {%PB_CONTACT_VISIBLE}) & ~{%PB_CONTACT_LIST_HIDDEN})
		WHERE
			(`flags` & ({%PB_CONTACT_AD_DELETED} | {%PB_CONTACT_AD_DISABLED})) = 0
			AND (
				((`flags` & {%PB_CONTACT_VISIBLE}) <> {%PB_CONTACT_VISIBLE})
				OR ((`flags` & {%PB_CONTACT_LIST_HIDDEN}) = {%PB_CONTACT_LIST_HIDDEN})
			)
	'));

	log_db('Reveal admin hidden contacts', '', 0);

	echo '{"code": 0, "message": "'.json_escape(LL('MessageRevealAdminHidden')).'"}';
}
