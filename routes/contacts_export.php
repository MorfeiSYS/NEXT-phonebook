<?php

function contacts_export(&$core, $params, $post_data)
{
	assert_permission_ajax(0, PB_ACCESS_ADMIN);

	header('Content-Type: text/plain; charset=utf-8');
	header("Content-Disposition: attachment; filename=\"base.xml\"; filename*=utf-8''base.xml");

	$result = array();
	$core->db->select_ex($result, rpv('SELECT m.`id`, m.`samaccountname`, m.`first_name`, m.`last_name`, m.`department`, m.`organization`, m.`position`, m.`phone_internal`, m.`phone_mobile`, m.`mail` FROM `@contacts` AS m WHERE (m.`flags` & {%PB_CONTACT_VISIBLE}) = {%PB_CONTACT_VISIBLE} AND NOT (((m.`flags` & {%PB_CONTACT_LIST_HIDDEN}) = {%PB_CONTACT_LIST_HIDDEN}) AND ((m.`flags` & ({%PB_CONTACT_AD_DELETED} | {%PB_CONTACT_AD_DISABLED})) <> 0)) ORDER BY m.`last_name`, m.`first_name`'));

	include(TEMPLATES_DIR.'tpl.contacts-export.php');
}
