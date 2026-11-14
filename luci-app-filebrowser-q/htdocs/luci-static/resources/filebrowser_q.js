'use strict';
'require form';
'require poll';
'require rpc';
'require uci';
'require view';
'require fs';

const callServiceList = rpc.declare({
	object: 'service',
	method: 'list',
	params: ['name'],
	expect: { '': {} }
});

function getServiceStatus() {
	return L.resolveDefault(callServiceList('filebrowser-q'), {}).then(function(res) {
		let isRunning = false;
		try {
			isRunning = res['filebrowser-q']['instances']['instance1']['running'];
		} catch (e) { }
		return isRunning;
	});
}

function renderStatus(isRunning, port) {
	let spanTemp = '<span style="color:%s"><strong>%s %s</strong></span>';
	let renderHTML;
	if (isRunning) {
		let button = String.format('&#160;<a class="btn cbi-button" href="http://%s:%s" target="_blank" rel="noreferrer noopener">%s</a>',
			window.location.hostname, port, _('Open Web Interface'));
		renderHTML = spanTemp.format('green', _('FileBrowser'), _('RUNNING')) + button;
	} else {
		renderHTML = spanTemp.format('red', _('FileBrowser'), _('NOT RUNNING'));
	}

	return renderHTML;
}

return view.extend({
	load() {
		return uci.load('filebrowser-q');
	},

	render(data) {
		let m, s, o;
		let webport = (uci.get(data, 'config', 'listen_port') || '8787');

		m = new form.Map('filebrowser-q', _('FileBrowser Quantum'),
			_('The best free self-hosted web-based file manager.') + '<br />' +
			_('Default login username is %s and password is %s.').format('<code>admin</code>', '<code>admin123</code>'));

		s = m.section(form.TypedSection);
		s.anonymous = true;
		s.render = function() {
			poll.add(function() {
				return L.resolveDefault(getServiceStatus()).then(function(res) {
					let view = document.getElementById('service_status');
					view.innerHTML = renderStatus(res, webport);
				});
			});

			return E('div', { class: 'cbi-section', id: 'status_bar' }, [
				E('p', { id: 'service_status' }, _('Collecting data...'))
			]);
		};

		s = m.section(form.NamedSection, 'config', 'filebrowser');

		o = s.option(form.Flag, 'enabled', _('Enable'));
		o.default = o.disabled;
		o.rmempty = false;

		o = s.option(form.Value, 'listen_port', _('Listen port'));
		o.datatype = 'port';
		o.default = '8787';
		o.rmempty = false;

		o = s.option(form.Value, 'root_path', _('Root directory'));
		o.default = '/';
		o.rmempty = false;

		o = s.option(form.Value, 'adminUsername', _('Admin username'));
		o.default = 'admin';
		o.rmempty = false;

		o = s.option(form.Value, 'adminPassword', _('Admin password'));
		o.password = true;
		o.datatype = 'minlength(5)';
		o.default = 'admin123';
		o.rmempty = false;
		o.validate = function(section_id, value) {
			if (value === 'admin')
				return _('Password cannot be "admin" (treated as unset by FileBrowser Quantum, minimum 5 characters).');
			return true;
		};

		o = s.option(form.Value, 'cacheDir', _('Cache directory'));
		o.default = '/tmp';
		o.rmempty = false;

		o = s.option(form.Value, 'cacheDirMaxSizeMB', _('Cache max size (MB)'));
		o.datatype = 'uinteger';
		o.default = '500';
		o.rmempty = false;

		return m.render();
	}
});