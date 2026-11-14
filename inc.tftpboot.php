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
	$name = trim($last_name);
	if($first_name !== '')
	{
		$name .= ' '.mb_substr(trim($first_name), 0, 1, 'UTF-8').'.';
	}
	if($middle_name !== '')
	{
		$name .= mb_substr(trim($middle_name), 0, 1, 'UTF-8').'.';
	}

	return trim($name);
}

function tftpboot_display_label($phone, $mac)
{
	$phone = trim((string)$phone);
	$mac = strtoupper(trim((string)$mac));

	return ($phone !== '' ? $phone : '?').' - '.$mac;
}
