<?php

if(!defined('CONTACT_TEXT_DB_MAX'))
{
	define('CONTACT_TEXT_DB_MAX', 255);
}
if(!defined('CONTACT_NAME_MAX'))
{
	define('CONTACT_NAME_MAX', 120);
}
if(!defined('CONTACT_PHONE_MAX'))
{
	define('CONTACT_PHONE_MAX', 80);
}
if(!defined('CONTACT_PHONE_INTERNAL_MIN'))
{
	define('CONTACT_PHONE_INTERNAL_MIN', 3);
}
if(!defined('CONTACT_PHONE_INTERNAL_MAX'))
{
	define('CONTACT_PHONE_INTERNAL_MAX', 5);
}
if(!defined('CONTACT_PHONE_EXTERNAL_MIN'))
{
	define('CONTACT_PHONE_EXTERNAL_MIN', 5);
}
if(!defined('CONTACT_PHONE_EXTERNAL_MAX'))
{
	define('CONTACT_PHONE_EXTERNAL_MAX', 12);
}
if(!defined('CONTACT_PHONE_MOBILE_MIN'))
{
	define('CONTACT_PHONE_MOBILE_MIN', 11);
}
if(!defined('CONTACT_PHONE_MOBILE_MAX'))
{
	define('CONTACT_PHONE_MOBILE_MAX', 12);
}

function contact_strip_control_chars($value)
{
	$value = (string) $value;
	if($value === '')
	{
		return '';
	}

	return preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $value);
}

function contact_normalize_spaces($value)
{
	$value = trim((string) $value);
	if($value === '')
	{
		return '';
	}
	$value = preg_replace('/[\r\n\t]+/u', ' ', $value);
	$value = preg_replace('/ +/u', ' ', $value);

	return trim($value);
}

function contact_normalize_phone_field($value)
{
	$value = contact_strip_control_chars($value);
	$value = trim($value);
	if($value === '')
	{
		return '';
	}

	return preg_replace('/[\r\n]+/', ' ', $value);
}

function contact_mb_len($value)
{
	if(function_exists('mb_strlen'))
	{
		return mb_strlen($value, 'UTF-8');
	}

	return strlen($value);
}

function contact_field_too_long($value, $max, $field, &$errors)
{
	if(contact_mb_len($value) > $max)
	{
		$errors[] = array(
			'name' => $field,
			'msg' => LL('ContactFieldTooLong')
		);
		return TRUE;
	}

	return FALSE;
}

function contact_has_forbidden_phone_chars($value)
{
	return (bool) preg_match('/[<>"\r\n]/', (string) $value);
}

function contact_phone_is_digits_only($value)
{
	$value = (string) $value;

	return ($value === '' || preg_match('/^\d+$/', $value));
}

function contact_phone_length_message($min, $max)
{
	return str_replace(
		array('%1', '%2'),
		array((string) $min, (string) $max),
		LL('ContactPhoneLength')
	);
}

function contact_validate_phone_form_field($value, $min, $max, $field, &$errors)
{
	if($value === '')
	{
		return;
	}

	if(!contact_phone_is_digits_only($value))
	{
		$errors[] = array('name' => $field, 'msg' => LL('ContactPhoneDigitsOnly'));
		return;
	}

	$len = strlen($value);
	if($len < $min || $len > $max)
	{
		$errors[] = array('name' => $field, 'msg' => contact_phone_length_message($min, $max));
	}
}

function contact_has_letter($value)
{
	return (bool) preg_match('/\p{L}/u', (string) $value);
}

function contacts_access_group_dns_list(&$core)
{
	$rows = array();
	if($core->db->select_assoc_ex($rows, rpv('
		SELECT DISTINCT a.`dn`
		FROM `@access` AS a
		WHERE a.`oid` = 0 AND a.`dn` <> \'\'
		ORDER BY a.`dn`
	')))
	{
		return $rows;
	}

	return array();
}

/**
 * @return array{
 *     contacts_add_allowed_groups: list<string>,
 *     contacts_access_group_dns: list<array{dn: string}>,
 *     contacts_add_groups_extra: list<string>
 * }
 */
function contacts_add_groups_settings(&$core)
{
	$allowed_groups = contacts_add_allowed_groups_list($core);
	$access_group_dns = contacts_access_group_dns_list($core);
	$known = array();
	foreach($access_group_dns as $grow)
	{
		$known[$grow['dn']] = TRUE;
	}
	$extra_list = array();
	foreach($allowed_groups as $dn)
	{
		if(empty($known[$dn]))
		{
			$extra_list[] = $dn;
		}
	}

	return array(
		'contacts_add_allowed_groups' => $allowed_groups,
		'contacts_access_group_dns' => $access_group_dns,
		'contacts_add_groups_extra' => $extra_list
	);
}

function contacts_add_allowed_groups_list(&$core)
{
	$raw = $core->Config->get_global('contacts_add_allowed_groups_json', '[]');
	$list = json_decode($raw, TRUE);
	if(!is_array($list))
	{
		return array();
	}

	$out = array();
	foreach($list as $dn)
	{
		$dn = trim((string) $dn);
		if($dn !== '')
		{
			$out[$dn] = $dn;
		}
	}

	return array_values($out);
}

function contacts_can_add(&$core)
{
	if(!$core->UserAuth->get_id())
	{
		return FALSE;
	}

	if(!$core->UserAuth->check_permission(0, PB_ACCESS_OPERATOR))
	{
		return FALSE;
	}

	$groups = contacts_add_allowed_groups_list($core);
	if(count($groups) === 0)
	{
		return TRUE;
	}

	foreach($groups as $dn)
	{
		if($core->UserAuth->is_member($dn))
		{
			return TRUE;
		}
	}

	return FALSE;
}

function contact_assert_can_add(&$core)
{
	if(!contacts_can_add($core))
	{
		echo json_encode(array(
			'code' => 1,
			'message' => LL('ContactAddDenied')
		), JSON_UNESCAPED_UNICODE);
		exit;
	}
}

function contact_parse_allowed_groups_post($post_groups, $extra_dns)
{
	$out = array();

	if(is_array($post_groups))
	{
		foreach($post_groups as $dn)
		{
			$dn = trim((string) $dn);
			if($dn !== '' && contact_mb_len($dn) <= 1024)
			{
				$out[$dn] = $dn;
			}
		}
	}

	$extra = preg_split('/\r\n|\r|\n/', (string) $extra_dns);
	if(is_array($extra))
	{
		foreach($extra as $line)
		{
			$dn = trim($line);
			if($dn !== '' && contact_mb_len($dn) <= 1024)
			{
				$out[$dn] = $dn;
			}
		}
	}

	return array_values($out);
}

function contact_validate_save_data($post_data, $type_max_index, &$out, &$errors)
{
	$errors = array();
	$out = array();

	$out['last_name'] = contact_normalize_spaces(contact_strip_control_chars(@$post_data['last_name']));
	$out['first_name'] = contact_normalize_spaces(contact_strip_control_chars(@$post_data['first_name']));
	$out['middle_name'] = contact_normalize_spaces(contact_strip_control_chars(@$post_data['middle_name']));
	$out['department'] = contact_normalize_spaces(contact_strip_control_chars(@$post_data['department']));
	$out['organization'] = contact_normalize_spaces(contact_strip_control_chars(@$post_data['organization']));
	$out['position'] = contact_normalize_spaces(contact_strip_control_chars(@$post_data['position']));
	$out['phone_internal'] = contact_normalize_phone_field(@$post_data['phone_internal']);
	$out['phone_external'] = contact_normalize_phone_field(@$post_data['phone_external']);
	$out['phone_mobile'] = contact_normalize_phone_field(@$post_data['phone_mobile']);
	$out['mail'] = trim(contact_strip_control_chars(@$post_data['mail']));
	$out['birthday'] = trim((string) @$post_data['birthday']);

	if($out['first_name'] === '')
	{
		$errors[] = array('name' => 'first_name', 'msg' => LL('ThisFieldRequired'));
	}
	else if(!contact_has_letter($out['first_name']))
	{
		$errors[] = array('name' => 'first_name', 'msg' => LL('ContactNameNeedsLetter'));
	}
	else
	{
		contact_field_too_long($out['first_name'], CONTACT_NAME_MAX, 'first_name', $errors);
	}

	foreach(array('department', 'organization', 'position', 'last_name', 'middle_name') as $field)
	{
		contact_field_too_long($out[$field], CONTACT_TEXT_DB_MAX, $field, $errors);
	}

	$phone_rules = array(
		'phone_internal' => array(CONTACT_PHONE_INTERNAL_MIN, CONTACT_PHONE_INTERNAL_MAX),
		'phone_external' => array(CONTACT_PHONE_EXTERNAL_MIN, CONTACT_PHONE_EXTERNAL_MAX),
		'phone_mobile' => array(CONTACT_PHONE_MOBILE_MIN, CONTACT_PHONE_MOBILE_MAX)
	);
	foreach($phone_rules as $field => $bounds)
	{
		if($out[$field] !== '')
		{
			contact_validate_phone_form_field($out[$field], $bounds[0], $bounds[1], $field, $errors);
		}
	}

	if($out['mail'] !== '')
	{
		contact_field_too_long($out['mail'], CONTACT_TEXT_DB_MAX, 'mail', $errors);
		if(!filter_var($out['mail'], FILTER_VALIDATE_EMAIL))
		{
			$errors[] = array('name' => 'mail', 'msg' => LL('ContactMailInvalid'));
		}
	}

	$type_raw = @$post_data['type'];
	if($type_raw === '' || $type_raw === NULL || !is_numeric($type_raw))
	{
		$errors[] = array('name' => 'type', 'msg' => LL('ThisFieldRequired'));
		$out['type'] = 0;
	}
	else
	{
		$type = intval($type_raw);
		if($type < 0 || $type > $type_max_index)
		{
			$errors[] = array('name' => 'type', 'msg' => LL('ValueNotFromList'));
		}
		$out['type'] = $type;
	}

	return (count($errors) === 0);
}