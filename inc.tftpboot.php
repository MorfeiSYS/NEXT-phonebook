<?php

function tftpboot_dir()
{
	if(defined('TFTBOOT_DIR'))
	{
		return rtrim(TFTBOOT_DIR, DIRECTORY_SEPARATOR).DIRECTORY_SEPARATOR;
	}

	return ROOT_DIR.'tftpboot'.DIRECTORY_SEPARATOR;
}

function tftpboot_backup_dir()
{
	if(defined('TFTBOOT_BACKUP_DIR'))
	{
		return rtrim(TFTBOOT_BACKUP_DIR, DIRECTORY_SEPARATOR).DIRECTORY_SEPARATOR;
	}

	return tftpboot_dir().'.backups'.DIRECTORY_SEPARATOR;
}

function tftpboot_instance(&$core)
{
	return $core->load('TftpBoot');
}

function user_has_tftpboot_access(&$core)
{
	if(!$core->UserAuth->get_id())
	{
		return FALSE;
	}

	return $core->UserAuth->check_permission(0, PB_ACCESS_TFTPBOOT);
}

function assert_tftpboot_ajax(&$core)
{
	if(!user_has_tftpboot_access($core))
	{
		echo '{"code": 1, "message": "'.json_escape(LL('AccessDenied')).'"}';
		exit;
	}
}

function tftpboot_policy_rank($mode)
{
	switch($mode)
	{
		case 'full': return 3;
		case 'custom': return 2;
		case 'buttons_only': return 1;
		default: return 0;
	}
}

function tftpboot_user_policy(&$core)
{
	if(user_is_admin())
	{
		return array(
			'mode' => 'full',
			'sections' => array('sip', 'dss', 'net', 'all'),
		);
	}

	$best = array('mode' => 'buttons_only', 'sections' => array('dss'));
	$best_rank = 0;
	$policies = array();

	if(!$core->db->select_assoc_ex($policies, rpv('SELECT `sid`, `mode`, `allowed_sections_json` FROM `@tftpboot_group_policy`')))
	{
		return $best;
	}

	$link = $core->UserAuth->is_ldap_user();

	foreach($policies as $row)
	{
		$sid = $row['sid'];
		if($link && defined('LDAP_USE_SID') && LDAP_USE_SID)
		{
			$records = array();
			if(!$core->LDAP->search($records, '(&(objectCategory=group)(objectSID='.$sid.'))', array('distinguishedName')))
			{
				continue;
			}

			$group_dn = $records[0]['distinguishedName'][0];
		}
		else
		{
			continue;
		}

		if(!$core->UserAuth->is_member($group_dn))
		{
			continue;
		}

		$rank = tftpboot_policy_rank($row['mode']);
		if($rank >= $best_rank)
		{
			$best_rank = $rank;
			$sections = json_decode($row['allowed_sections_json'], TRUE);
			if(!is_array($sections))
			{
				$sections = array('dss');
			}

			$best = array(
				'mode' => $row['mode'],
				'sections' => $sections,
			);
		}
	}

	return $best;
}

function tftpboot_bulk_vendor_choices($svc)
{
	$list = $svc->get_enabled_vendors('bulk');
	if(!count($list))
	{
		return array('fanvil', 'cisco', 'yealink', 'grandstream', 'eltex', 'unknown');
	}

	return $list;
}

/**
 * @return array{0: array, 1: bool} vendors, explicit selection from request
 */
function tftpboot_bulk_vendors_from_post($post_data, $svc)
{
	$allowed = tftpboot_bulk_vendor_choices($svc);

	if(array_key_exists('vendors', $post_data))
	{
		$raw = isset($post_data['vendors']) && is_array($post_data['vendors']) ? $post_data['vendors'] : array();

		return array(array_values(array_intersect($raw, $allowed)), TRUE);
	}

	return array($allowed, FALSE);
}

function tftpboot_json_send($data)
{
	echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}

function tftpboot_merge_post($post_data)
{
	$ct = isset($_SERVER['CONTENT_TYPE']) ? $_SERVER['CONTENT_TYPE'] : '';
	if(strpos($ct, 'application/json') !== FALSE)
	{
		$raw = file_get_contents('php://input');
		$j = json_decode($raw, TRUE);
		if(is_array($j))
		{
			return $j;
		}
	}

	return is_array($post_data) ? $post_data : array();
}

function tftpboot_format_initials($last_name, $first_name, $middle_name)
{
	$last_name = trim((string)$last_name);
	$first_name = trim((string)$first_name);
	$middle_name = trim((string)$middle_name);

	if($last_name === '' && $first_name !== '' && preg_match('/\s/u', $first_name))
	{
		$parts = preg_split('/\s+/u', $first_name, -1, PREG_SPLIT_NO_EMPTY);
		if(count($parts) >= 2)
		{
			$last_name = $parts[0];
			$first_name = $parts[1];
			$middle_name = isset($parts[2]) ? $parts[2] : '';
		}
	}

	$name = $last_name;
	if($name === '' && $first_name !== '')
	{
		$name = $first_name;
		$first_name = '';
	}
	if($first_name !== '')
	{
		$name .= ' '.mb_substr($first_name, 0, 1, 'UTF-8').'.';
	}
	if($middle_name !== '')
	{
		$name .= mb_substr($middle_name, 0, 1, 'UTF-8').'.';
	}

	return trim($name);
}

/** Skip VoIP URI / bare IP — not internal extension directory entries. */
function tftpboot_phone_field_ignored($phone_internal)
{
	$s = trim((string)$phone_internal);
	if($s === '')
	{
		return TRUE;
	}
	if(preg_match('/^(h323|sip|sips|tel|ldap|http|https):/i', $s))
	{
		return TRUE;
	}
	if(preg_match('/\bh323:/i', $s))
	{
		return TRUE;
	}
	if(preg_match('/^\d{1,3}(\.\d{1,3}){3}(:\d+)?$/', $s))
	{
		return TRUE;
	}

	return FALSE;
}

/** Digit groups from free-text internal phone field (211 (Мск) 8989 → 211, 8989). */
function tftpboot_extract_phone_numbers($phone_internal)
{
	if(tftpboot_phone_field_ignored($phone_internal))
	{
		return array();
	}
	if(!preg_match_all('/\d+/', (string)$phone_internal, $m))
	{
		return array();
	}
	$out = array();
	foreach($m[0] as $num)
	{
		if(strlen($num) < 3)
		{
			continue;
		}
		$out[$num] = TRUE;
	}

	return array_keys($out);
}

function tftpboot_map_put_contact(&$map, $phone_internal, $name)
{
	foreach(tftpboot_extract_phone_numbers($phone_internal) as $num)
	{
		$map[$num] = $name;
	}
}

function tftpboot_directory_rows_from_map($map)
{
	$rows = array();
	foreach($map as $num => $name)
	{
		if(!preg_match('/^\d+$/', (string)$num))
		{
			continue;
		}
		$rows[] = array('number' => (string)$num, 'name' => (string)$name);
	}
	usort($rows, function($a, $b) {
		$na = strlen($a['number']);
		$nb = strlen($b['number']);
		if($na !== $nb)
		{
			return $na - $nb;
		}

		return strcmp($a['number'], $b['number']);
	});

	return $rows;
}

function tftpboot_sync_undo_load(&$core)
{
	$raw = $core->Config->get_global('tftpboot_sync_undo_json', '');
	$data = json_decode($raw, TRUE);

	return is_array($data) && !empty($data['items']) ? $data : NULL;
}

function tftpboot_sync_undo_save(&$core, $data)
{
	$core->Config->set_global('tftpboot_sync_undo_json', json_encode($data, JSON_UNESCAPED_UNICODE));
}

function tftpboot_sync_undo_clear(&$core)
{
	$core->Config->set_global('tftpboot_sync_undo_json', '');
}

function tftpboot_sync_api_configured(&$core)
{
	if($core->Config->get_global('tftpboot_sync_source', 'phonebook') !== 'api')
	{
		return FALSE;
	}
	if(trim($core->Config->get_global('tftpboot_sync_api_url', '')) !== '')
	{
		return TRUE;
	}
	if(defined('WEB_URL') && trim(WEB_URL) !== '')
	{
		return TRUE;
	}

	return FALSE;
}

function tftpboot_display_label($phone, $mac)
{
	$phone = trim((string)$phone);
	$mac = strtoupper(trim((string)$mac));

	return ($phone !== '' ? $phone : '?').' - '.$mac;
}

function tftpboot_special_dial_token($number)
{
	$v = strtoupper(trim((string)$number));
	if($v === 'AUTO')
	{
		return $v;
	}
	if(preg_match('/^SIP\d+$/', $v))
	{
		return $v;
	}
	if($v === 'F_SMS' || $v === 'F_MWI' || $v === 'F_RECORD')
	{
		return $v;
	}

	return '';
}

function tftpboot_sanitize_speed_dial_number($number, $allow_special = TRUE)
{
	$raw = trim((string)$number);
	if($allow_special)
	{
		$spec = tftpboot_special_dial_token($raw);
		if($spec !== '')
		{
			return $spec;
		}
	}
	$digits = preg_replace('/\D+/', '', $raw);
	if(strlen($digits) > 11)
	{
		$digits = substr($digits, 0, 11);
	}

	return $digits;
}

function tftpboot_sanitize_speed_dial_post(&$post)
{
	if(!isset($post['speedDialKeys']) || !is_array($post['speedDialKeys']))
	{
		return;
	}

	foreach($post['speedDialKeys'] as &$k)
	{
		if(!is_array($k))
		{
			continue;
		}
		if(isset($k['number']))
		{
			$k['number'] = tftpboot_sanitize_speed_dial_number($k['number']);
		}
	}
	unset($k);
}

function tftpboot_self_contact(&$core)
{
	if(!$core->UserAuth->get_id() || !$core->UserAuth->is_ldap_user())
	{
		return NULL;
	}

	$login = $core->UserAuth->get_login();
	$rows = array();
	if(!$core->db->select_assoc_ex(
		$rows,
		rpv(
			'SELECT `id`, `samaccountname`, `first_name`, `last_name`, `middle_name`, `phone_internal` '.
			'FROM `@contacts` WHERE `samaccountname` = ! LIMIT 1',
			$login
		)
	))
	{
		return NULL;
	}

	return $rows[0];
}

function tftpboot_self_phone_numbers(&$core)
{
	$contact = tftpboot_self_contact($core);
	if(!$contact)
	{
		return array();
	}

	return tftpboot_extract_phone_numbers($contact['phone_internal']);
}

function tftpboot_self_config_files(&$core)
{
	$nums = tftpboot_self_phone_numbers($core);
	if(!count($nums))
	{
		return array();
	}

	$svc = tftpboot_instance($core);
	$in = array();
	foreach($nums as $n)
	{
		$in[] = '\''.sql_escape((string)$n).'\'';
	}
	if(!count($in))
	{
		return array();
	}

	$rows = array();
	$sql = 'SELECT `filename`, `phone`, `mac`, `vendor`, `model` FROM `@tftpboot_file` WHERE `phone` IN ('.implode(',', $in).') ORDER BY `phone`, `filename`';
	if(!$core->db->select_assoc_ex($rows, $sql))
	{
		return array();
	}

	$out = array();
	foreach($rows as $row)
	{
		if(!$svc->resolve_path($row['filename']))
		{
			continue;
		}
		$out[] = $row;
	}

	return $out;
}

function user_can_tftpboot_self(&$core)
{
	if(!$core->UserAuth->get_id() || !$core->UserAuth->is_ldap_user())
	{
		return FALSE;
	}

	return count(tftpboot_self_config_files($core)) > 0;
}

function user_has_tftpboot_menu(&$core)
{
	return user_has_tftpboot_access($core) || user_can_tftpboot_self($core);
}

function tftpboot_is_self_only_user(&$core)
{
	return user_can_tftpboot_self($core) && !user_has_tftpboot_access($core);
}

function tftpboot_self_file_allowed(&$core, $filename)
{
	$filename = trim((string)$filename);
	if($filename === '')
	{
		return FALSE;
	}

	foreach(tftpboot_self_config_files($core) as $row)
	{
		if($row['filename'] === $filename)
		{
			return TRUE;
		}
	}

	return FALSE;
}

function assert_tftpboot_self_file(&$core, $filename)
{
	if(!tftpboot_self_file_allowed($core, $filename))
	{
		echo '{"code": 1, "message": "'.json_escape(LL('AccessDenied')).'"}';
		exit;
	}
}

function assert_tftpboot_self_ajax(&$core)
{
	if(!user_can_tftpboot_self($core))
	{
		echo '{"code": 1, "message": "'.json_escape(LL('AccessDenied')).'"}';
		exit;
	}
}

function user_can_tftpboot_moderate(&$core)
{
	if(!$core->UserAuth->get_id())
	{
		return FALSE;
	}

	if(user_is_admin())
	{
		return TRUE;
	}

	return user_is_operator() && user_has_tftpboot_access($core);
}

function assert_tftpboot_moderate_ajax(&$core)
{
	if(!user_can_tftpboot_moderate($core))
	{
		echo '{"code": 1, "message": "'.json_escape(LL('AccessDenied')).'"}';
		exit;
	}
}

function assert_tftpboot_config_ajax(&$core)
{
	if(user_has_tftpboot_access($core))
	{
		return;
	}
	if(user_can_tftpboot_self($core))
	{
		return;
	}

	echo '{"code": 1, "message": "'.json_escape(LL('AccessDenied')).'"}';
	exit;
}
