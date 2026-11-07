<?php

function contacts_export_xml(&$core, $params, $post_data)
{
	assert_permission_ajax(0, PB_ACCESS_ADMIN);	// level 0 having Write access mean admin

	header('Content-Type: text/plain; charset=utf-8');
	header("Content-Disposition: attachment; filename=\"base.xml\"; filename*=utf-8''base.xml");

	// Whitelist columns from SHOW COLUMNS — escape as identifiers (backticks), not string literals.
	$result = array();
	$columns = contacts_table_column_names($core);
	if(!empty($columns))
	{
		$fields = array();
		foreach($columns as $col)
		{
			if($col === '' || !is_string($col))
			{
				continue;
			}
			$fields[] = '`'.str_replace('`', '``', $col).'`';
		}
		if(!empty($fields))
		{
			$query = rpv('SELECT {r0} FROM `@contacts` AS m', implode(', ', $fields));
			if($core->db->select_assoc_ex($result, $query) === FALSE)
			{
				$result = array();
			}
		}
	}

	include(TEMPLATES_DIR.'tpl.contacts-export-xml.php');
}

