<?php

function complete_group(&$core, $params, $post_data)
{
	$search = @$post_data['search'];

	$result_json = array(
		'code' => 0,
		'message' => '',
		'list' => array()
	);
	
	if(defined('USE_LDAP') && USE_LDAP && !empty($search) && strlen($search) >= 3)
	{
		$result = array();
		if($core->LDAP->search($result, '(&(objectCategory=group)(cn='.ldap_escape($search, '', LDAP_ESCAPE_FILTER).'*))', array('distinguishedName')))
		{
			foreach($result as $row)
			{
				$result_json['list'][] = $row['distinguishedName'][0];
			}
		}
	}

	echo json_encode($result_json);
}
