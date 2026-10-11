(function () {
  'use strict';

  // Flarum bọc file này như một module rồi đọc `module.exports` để đăng ký extension
  // (flarum.extensions['kuma-develop-level'] = module.exports). Thiếu dòng này thì giá trị là
  // undefined và bootExtensions của Flarum sẽ lỗi "reading 'extend'".
  try { if (typeof module !== 'undefined') { module.exports = {}; } } catch (e) {}

  function log(msg, e) { try { console.error('[kuma-develop-level] ' + msg, e || ''); } catch (x) {} }

  try {
    adminInit();
  } catch (e) {
    log('admin.js không khởi tạo được:', e);
  }

  function adminInit() {

  function core(path) {
    try {
      if (flarum.reg && flarum.reg.get) {
        var r = flarum.reg.get('core', path);
        if (r) return r;
      }
    } catch (e) {}
    try {
      return flarum.core && flarum.core.compat ? flarum.core.compat[path] : undefined;
    } catch (e) {}
  }
  function cls(path) {
    var c = core(path);
    return c && c.default ? c.default : c;
  }

  var app = (flarum.core && flarum.core.app) || window.app;
  var Switch = cls('common/components/Switch');

  function t(key, params) {
    var r = app.translator.trans('kuma-develop-level.' + key, params || {});
    return Array.isArray(r) ? r.join('') : r;
  }

  var DEFAULTS = [
    { exp: 0, key: 'newbie', name: '', icon: 'fas fa-seedling', color: '#64748b' },
    { exp: 50, key: 'apprentice', name: '', icon: 'fas fa-leaf', color: '#16a34a' },
    { exp: 200, key: 'member', name: '', icon: 'fas fa-tree', color: '#16a34a' },
    { exp: 450, key: 'active', name: '', icon: 'fas fa-shield-alt', color: '#2563eb' },
    { exp: 800, key: 'expert', name: '', icon: 'fas fa-star', color: '#2563eb' },
    { exp: 1250, key: 'elite', name: '', icon: 'fas fa-bolt', color: '#7c3aed' },
    { exp: 1800, key: 'master', name: '', icon: 'fas fa-gem', color: '#7c3aed' },
    { exp: 2450, key: 'grandmaster', name: '', icon: 'fas fa-fire', color: '#db2777' },
    { exp: 3200, key: 'legend', fx: true, name: '', icon: 'fas fa-dragon', color: '#f59e0b' },
    { exp: 4050, key: 'sovereign', fx: true, name: '', icon: 'fas fa-crown', color: '#f59e0b' }
  ];

  var ICON_PRESETS = [
    'fas fa-seedling', 'fas fa-leaf', 'fas fa-tree', 'fas fa-shield-alt', 'fas fa-star', 'fas fa-bolt',
    'fas fa-gem', 'fas fa-fire', 'fas fa-dragon', 'fas fa-crown', 'fas fa-trophy', 'fas fa-medal',
    'fas fa-award', 'fas fa-rocket', 'fas fa-heart', 'fas fa-ghost', 'fas fa-skull', 'fas fa-paw',
    'fas fa-anchor', 'fas fa-chess-king', 'fas fa-hat-wizard', 'fas fa-user-shield', 'fas fa-sun', 'fas fa-moon'
  ];

  function parse(raw) {
    var arr = null;
    try { arr = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch (e) {}
    if (!Array.isArray(arr) || !arr.length) arr = DEFAULTS;
    return arr.map(function (l) {
      var key = String((l && l.key) || '');
      return {
        exp: Math.max(0, parseInt(l && l.exp, 10) || 0),
        key: /^[a-z0-9_]+$/.test(key) ? key : '',
        fx: !!(l && l.fx),
        name: String((l && l.name) || ''),
        icon: String((l && l.icon) || ''),
        color: /^#[0-9a-f]{6}$/i.test(l && l.color) ? l.color : '#64748b'
      };
    });
  }
  function safeIcon(i) { return /^[a-z0-9 _-]+$/i.test(i) ? i : ''; }

  app.initializers.add('kuma-develop-level', function () {
    // Flarum 2.0 đổi tên app.extensionData thành app.registry
    var registry = app.registry || app.extensionData;
    if (!registry || !registry.for) {
      log('không tìm thấy app.registry / app.extensionData, bỏ qua trang cài đặt');
      return;
    }

    registry
      .for('kuma-develop-level')
      .registerSetting({ setting: 'kuma-develop-level.exp_discussion', type: 'number', min: 0, placeholder: '10', label: t('admin.exp_discussion') })
      .registerSetting({ setting: 'kuma-develop-level.exp_post', type: 'number', min: 0, placeholder: '5', label: t('admin.exp_post') })
      .registerSetting({ setting: 'kuma-develop-level.exp_daily', type: 'number', min: 0, placeholder: '2', label: t('admin.exp_daily') })
      .registerSetting({ setting: 'kuma-develop-level.timezone', type: 'text', placeholder: 'Asia/Ho_Chi_Minh', label: t('admin.timezone'), help: t('admin.timezone_help') })
      .registerSetting(function () {
        var s = this.setting('kuma-develop-level.icons_enabled', '1');
        var on = s() === '1' || s() === 1 || s() === true;
        return m('.Form-group', [
          Switch.component({ state: on, onchange: function (v) { s(v ? '1' : '0'); } }, t('admin.icons_enabled')),
          m('p.helpText', t('admin.icons_help'))
        ]);
      }, 90)
      .registerSetting(function () {
        var stream = this.setting('kuma-develop-level.levels');
        var list = parse(stream());

        function save(next) { stream(JSON.stringify(next)); }
        function update(i, field, value) { list[i][field] = value; save(list); }
        function sortAndSave() {
          list.sort(function (a, b) { return a.exp - b.exp; });
          list[0].exp = 0;
          for (var k = 1; k < list.length; k++) {
            if (list[k].exp <= list[k - 1].exp) list[k].exp = list[k - 1].exp + 1;
          }
          save(list);
        }

        var col = function (w, text) { return m('span', { style: 'width:' + w + 'px;font-size:12px;opacity:.7' }, text); };

        var rows = list.map(function (l, i) {
          var icon = safeIcon(l.icon);
          var placeholder = l.key ? t('lib.default_names.' + l.key) : t('admin.new_level');
          return m('div', { key: i, style: 'display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-bottom:8px' }, [
            m('span', { style: 'width:44px;font-weight:600' }, t('lib.level_short', { level: i + 1 })),
            m('input.FormControl', {
              style: 'width:130px', placeholder: placeholder, value: l.name,
              oninput: function (e) { update(i, 'name', e.target.value); }
            }),
            m('input.FormControl', {
              type: 'number', min: 0, style: 'width:100px', value: l.exp, disabled: i === 0,
              oninput: function (e) { update(i, 'exp', Math.max(0, parseInt(e.target.value, 10) || 0)); },
              onchange: sortAndSave
            }),
            m('input.FormControl', {
              list: 'kuma-develop-level-icons', style: 'width:170px', placeholder: 'fas fa-star', value: l.icon,
              oninput: function (e) { update(i, 'icon', e.target.value); }
            }),
            m('span', { style: 'width:22px;text-align:center;color:' + l.color }, icon ? m('i', { className: icon }) : null),
            m('input', {
              type: 'color', value: l.color, style: 'width:36px;height:30px;padding:0;border:0;background:none',
              oninput: function (e) { update(i, 'color', e.target.value); }
            }),
            m('input', {
              type: 'checkbox', checked: !!l.fx, title: t('admin.fx_title'), style: 'width:40px',
              onchange: function (e) { update(i, 'fx', e.target.checked); }
            }),
            m('button.Button.Button--icon', {
              type: 'button', title: t('admin.delete_title'), disabled: list.length <= 1,
              onclick: function () { list.splice(i, 1); sortAndSave(); }
            }, m('i.fas.fa-times'))
          ]);
        });

        return m('.Form-group', [
          m('label', t('admin.levels_title')),
          m('p.helpText', t('admin.levels_help')),
          m('div', { style: 'display:flex;gap:6px;margin-bottom:4px' }, [
            col(44, t('admin.col_level')), col(130, t('admin.col_name')), col(100, t('admin.col_exp')),
            col(170, t('admin.col_icon')), col(22, ''), col(36, t('admin.col_color')), col(40, t('admin.col_fx'))
          ]),
          rows,
          m('datalist#kuma-develop-level-icons', ICON_PRESETS.map(function (i) { return m('option', { value: i }); })),
          m('div', { style: 'display:flex;gap:8px;margin-top:8px' }, [
            m('button.Button', {
              type: 'button',
              onclick: function () {
                var last = list[list.length - 1];
                list.push({
                  exp: last.exp + Math.max(100, Math.round(last.exp * 0.25)),
                  key: '', fx: false, name: '', icon: 'fas fa-star', color: last.color
                });
                sortAndSave();
              }
            }, [m('i.fas.fa-plus'), ' ' + t('admin.add_level')]),
            m('button.Button', {
              type: 'button',
              onclick: function () { if (confirm(t('admin.reset_confirm'))) save(DEFAULTS); }
            }, t('admin.reset'))
          ])
        ]);
      }, 80);
  });
  }
})();
