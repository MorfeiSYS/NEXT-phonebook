<?php
/**
 *  @file setting_save.php
 *  @brief При сохранении параметра оканчивающегося на _json производится
 *  попытка распарсить значение, чтобы исключить опечатки в формате.
 */
 
function setting_save(&$core, $params, $post_data)
{
	$result_json = array(
		'code' => 0,
		'message' => '',
		'errors' => array()
	);

	assert_permission_ajax(0, PB_ACCESS_ADMIN);

	$user_id = intval(@$post_data['uid']);
	$setting_key = @$post_data['key'];
	$setting_value = @$post_data['value'];

	if($setting_key === 'contacts_columns_json')
	{
		$columns = contacts_columns_normalize($setting_value);
		if(!$columns)
		{
			$result_json['code'] = 1;
			$result_json['message'] = LL('ColumnsRequired');
			echo json_encode($result_json, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
			return;
		}

		$setting_value = json_encode($columns);
	}
	else if($setting_key === 'theme_default' && $setting_value !== 'light' && $setting_value !== 'dark')
	{
		$result_json['code'] = 1;
		$result_json['message'] = LL('ValueNotFromList');
		echo json_encode($result_json, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
		return;
	}
	else if($setting_key === 'contacts_add_allowed_groups_json')
	{
		$list = json_decode($setting_value, TRUE);
		if(!is_array($list))
		{
			$result_json['code'] = 1;
			$result_json['message'] = 'Failed parse JSON value';
			echo json_encode($result_json, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
			return;
		}
		$clean = array();
		foreach($list as $dn)
		{
			$dn = trim((string) $dn);
			if($dn !== '' && contact_mb_len($dn) <= 1024)
			{
				$clean[$dn] = $dn;
			}
		}
		if(count($clean) > 64)
		{
			$result_json['code'] = 1;
			$result_json['message'] = LL('ContactsAddGroupsTooMany');
			echo json_encode($result_json, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
			return;
		}
		$setting_value = json_encode(array_values($clean), JSON_UNESCAPED_UNICODE);
	}

	if(!empty($setting_value) && preg_match('/_json$/i', $setting_key))
	{
		if(json_decode($setting_value, TRUE) === NULL)
		{
			$result_json['code'] = 1;
			$result_json['message'] = 'Failed parse JSON value. ERROR: '.json_last_error_msg();

			echo json_encode($result_json, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

			return;
		}
	}

	if($user_id)
	{
		$core->Config->set_user($setting_key, $setting_value);
	}
	else
	{
		$core->Config->set_global($setting_key, $setting_value);
	}

	log_db('Updated settings', '{uid='.$user_id.',key="'.$setting_key.',value="'.$setting_value.'"}', 0);
	$result_json['message'] = LL('SuccessfulUpdated');

	echo json_encode($result_json, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
}
