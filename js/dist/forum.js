(function () {
  'use strict';

  // Flarum bọc file này như một module rồi đọc `module.exports` để đăng ký extension
  // (flarum.extensions['kuma-develop-level'] = module.exports). Thiếu dòng này thì giá trị là
  // undefined và bootExtensions của Flarum sẽ lỗi "reading 'extend'".
  try { if (typeof module !== 'undefined') { module.exports = {}; } } catch (e) {}

  // Mọi lỗi của extension chỉ được ghi vào console (tiền tố [kuma-develop-level]),
  // không bao giờ làm hỏng việc tải diễn đàn.
  function log(msg, e) {
    try { console.error('[kuma-develop-level] ' + msg, e || ''); } catch (x) {}
  }

  try {
    init();
  } catch (e) {
    log('forum.js không khởi tạo được:', e);
  }

  function init() {
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
      if (!c) log('không tìm thấy module core: ' + path);
      return c && c.default ? c.default : c;
    }

    var app = (flarum.core && flarum.core.app) || window.app || cls('forum/app');
    if (!app) { log('không tìm thấy app, bỏ qua extension'); return; }

    var ext = core('common/extend');
    var extend = ext && (ext.extend || (ext.default && ext.default.extend));
    if (!extend) { log('không tìm thấy common/extend, bỏ qua extension'); return; }

    var CommentPost = cls('forum/components/CommentPost');
    var UserCard = cls('forum/components/UserCard');
    var UserControls = cls('forum/utils/UserControls');
    var Modal = cls('common/components/Modal');
    var Notification = cls('forum/components/Notification');
    var NotificationGrid = cls('forum/components/NotificationGrid');
    var Button = cls('common/components/Button');
    var Stream = cls('common/utils/Stream');

    function t(key, params) {
      try {
        var r = app.translator.trans('kuma-develop-level.' + key, params || {});
        return Array.isArray(r) ? r.join('') : r;
      } catch (e) {
        return key;
      }
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

    function levels() {
      var raw = app.forum.attribute('kumaDevelopLevelConfig');
      var arr = null;
      try { arr = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch (e) {}
      if (!Array.isArray(arr) || !arr.length) arr = DEFAULTS;
      var out = arr.map(function (l) {
        var key = String((l && l.key) || '');
        return {
          exp: Math.max(0, parseInt(l && l.exp, 10) || 0),
          key: /^[a-z0-9_]+$/.test(key) ? key : '',
          fx: !!(l && l.fx),
          name: String((l && l.name) || ''),
          icon: String((l && l.icon) || ''),
          color: String((l && l.color) || '')
        };
      });
      out.sort(function (a, b) { return a.exp - b.exp; });
      out[0].exp = 0;
      for (var i = 1; i < out.length; i++) {
        if (out[i].exp <= out[i - 1].exp) out[i].exp = out[i - 1].exp + 1;
      }
      return out;
    }

    function levelName(cfg) {
      return cfg.name || (cfg.key ? t('lib.default_names.' + cfg.key) : '');
    }

    function safeIcon(i) { return /^[a-z0-9 _-]+$/i.test(i) ? i : ''; }
    function safeColor(c) { return /^#[0-9a-f]{6}$/i.test(c) ? c : '#64748b'; }
    function textColor(hex) {
      var n = parseInt(hex.slice(1), 16);
      var lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
      return lum > 0.65 ? '#1f2937' : '#ffffff';
    }

    function mix(hex, target, amt) {
      var n = parseInt(hex.slice(1), 16);
      function c(v) { return Math.round(v + (target - v) * amt); }
      return 'rgb(' + c((n >> 16) & 255) + ',' + c((n >> 8) & 255) + ',' + c(n & 255) + ')';
    }
    function rgba(hex, a) {
      var n = parseInt(hex.slice(1), 16);
      return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
    }
    function gradient(color, premium) {
      return premium
        ? 'linear-gradient(135deg,' + mix(color, 255, 0.5) + ' 0%,' + color + ' 48%,' + mix(color, 0, 0.3) + ' 100%)'
        : 'linear-gradient(135deg,' + mix(color, 255, 0.16) + ',' + color + ')';
    }

    function info(user) {
      var lv = user && user.attribute ? user.attribute('level') : 0;
      if (!lv) return null;
      var L = levels();
      var idx = Math.min(lv, L.length) - 1;
      return {
        level: lv, cfg: L[idx], next: L[idx + 1] || null, exp: user.attribute('exp') || 0,
        premium: idx === L.length - 1 || !!L[idx].fx
      };
    }

    function expText(d) {
      return d.next ? t('forum.exp_progress', { exp: d.exp, next: d.next.exp }) : t('forum.exp_max', { exp: d.exp });
    }

    function iconEl(cfg, extraClass) {
      var icon = app.forum.attribute('kumaDevelopLevelIcons') ? safeIcon(cfg.icon) : '';
      return icon ? m('i', { className: icon + ' ' + (extraClass || ''), 'aria-hidden': 'true' }) : null;
    }

    function fmt(n) {
      try { return Number(n).toLocaleString(); } catch (e) { return String(n); }
    }

    function progress(d) {
      if (!d.next) return 100;
      var span = d.next.exp - d.cfg.exp;
      if (span <= 0) return 100;
      return Math.max(0, Math.min(100, ((d.exp - d.cfg.exp) / span) * 100));
    }

    // Đặt thẻ thông tin (position: fixed) ngay dưới huy hiệu, tự lật lên trên / kéo vào nếu sát mép màn hình
    var activeWrap = null;
    function repositionActive() { if (activeWrap) positionTip(activeWrap); }
    function showTip(e) {
      e.redraw = false;
      activeWrap = e.currentTarget;
      positionTip(activeWrap);
      window.addEventListener('scroll', repositionActive, true);
      window.addEventListener('resize', repositionActive);
    }
    function hideTip(e) {
      e.redraw = false;
      activeWrap = null;
      window.removeEventListener('scroll', repositionActive, true);
      window.removeEventListener('resize', repositionActive);
    }
    function positionTip(wrap) {
      try {
        var tip = wrap.querySelector('.LevelTip');
        if (!tip) return;
        var r = wrap.getBoundingClientRect();
        var w = 224;
        var h = tip.offsetHeight || 140;
        var left = Math.max(8, Math.min(r.left, window.innerWidth - w - 8));
        var up = r.bottom + 10 + h > window.innerHeight && r.top - 10 - h > 0;
        tip.style.left = left + 'px';
        tip.style.top = (up ? r.top - 10 - h : r.bottom + 10) + 'px';
        tip.style.setProperty('--arrow-x', Math.max(14, Math.min(r.left + r.width / 2 - left - 5, w - 24)) + 'px');
        tip.classList.toggle('LevelTip--up', up);
      } catch (x) {}
    }

    function isSelf(user) {
      try { return !!(app.session && app.session.user && user && String(app.session.user.id()) === String(user.id())); } catch (e) { return false; }
    }

    function tipEl(d, color, nm, user) {
      var pct = progress(d);
      var nextName = d.next ? levelName(d.next) : '';
      return m('span.LevelTip', { role: 'tooltip', style: '--level-color:' + color }, [
        m('span.LevelTip-head', [
          m('span.LevelTip-medal', { style: 'background:' + gradient(color, true) + ';color:' + textColor(color) }, iconEl(d.cfg) || String(d.level)),
          m('span.LevelTip-title', [
            m('span.LevelTip-name', nm || t('lib.level_short', { level: d.level })),
            m('span.LevelTip-sub', t('forum.card_level', { level: d.level }))
          ])
        ]),
        m('span.LevelTip-bar', m('span.LevelTip-fill', {
          style: 'width:' + pct + '%;background:linear-gradient(90deg,' + mix(color, 0, 0.25) + ',' + color + ',' + mix(color, 255, 0.35) + ')'
        })),
        m('span.LevelTip-nums', [
          m('span', fmt(d.exp) + ' EXP'),
          m('span', d.next ? '/ ' + fmt(d.next.exp) : t('forum.tip_max'))
        ]),
        m('span.LevelTip-foot', d.next
          ? t('forum.tip_remaining', { remaining: fmt(d.next.exp - d.exp), level: d.level + 1, name: nextName ? ' · ' + nextName : '' })
          : (isSelf(user) ? t('forum.tip_max_desc') : t('forum.tip_max_desc_other', { name: user.displayName() })))
      ]);
    }

    function badge(user) {
      var d = info(user);
      if (!d) return null;
      var color = safeColor(d.cfg.color);
      var nm = levelName(d.cfg);
      var label = t('lib.level_short', { level: d.level }) + (d.premium && nm ? ' · ' + nm : '');
      return m('span.LevelBadgeWrap', {
        tabindex: 0,
        'aria-label': (nm ? nm + ' · ' : '') + expText(d),
        onmouseenter: showTip,
        onfocus: showTip,
        onmouseleave: hideTip,
        onblur: hideTip
      }, [
        m('span.LevelBadge' + (d.premium ? '.LevelBadge--premium' : ''), {
          style: 'background:' + gradient(color, d.premium) + ';color:' + textColor(color) + ';--level-glow:' + rgba(color, 0.6)
        }, [iconEl(d.cfg, 'LevelBadge-icon'), label]),
        tipEl(d, color, nm, user)
      ]);
    }

    // Modal chỉ được tạo khi cần, để thiếu Modal cũng không làm hỏng lúc tải trang
    var LevelModal = null;
    function getLevelModal() {
      if (LevelModal) return LevelModal;
      if (!Modal) throw new Error('thiếu common/components/Modal');

      LevelModal = class extends Modal {
        oninit(vnode) {
          super.oninit(vnode);
          this.user = this.attrs.user;
          this.exp = Stream(this.user.attribute('exp') || 0);
          this.loading = false;
        }
        className() { return 'LevelModal Modal--small'; }
        title() { return t('forum.modal_title', { name: this.user.displayName() }); }
        content() {
          var self = this;
          var L = levels();
          var options = [m('option', { value: '' }, t('forum.modal_choose'))].concat(
            L.map(function (l, i) {
              var nm = levelName(l);
              return m('option', { value: i }, t('forum.modal_option', { level: i + 1, name: nm ? ' · ' + nm : '', exp: l.exp }));
            })
          );
          return m('.Modal-body', m('.Form', [
            m('.Form-group', [
              m('label', t('forum.modal_by_level')),
              m('select.FormControl', {
                onchange: function (e) {
                  var i = parseInt(e.target.value, 10);
                  if (L[i]) self.exp(L[i].exp);
                }
              }, options)
            ]),
            m('.Form-group', [
              m('label', t('forum.modal_exp')),
              m('input.FormControl', {
                type: 'number', min: 0, value: this.exp(),
                oninput: function (e) { self.exp(e.target.value); },
                onkeydown: function (e) {
                  if (e.key === 'Enter') { e.preventDefault(); self.save(); }
                }
              })
            ]),
            m('.Form-group', Button.component({
              className: 'Button Button--primary', type: 'button', loading: this.loading,
              onclick: function () { self.save(); }
            }, t('forum.modal_save')))
          ]));
        }
        save() {
          if (this.loading) return;
          var self = this;
          this.loading = true;
          m.redraw();
          this.user.save({ exp: Math.max(0, parseInt(this.exp(), 10) || 0) }).then(
            function () {
              self.loading = false;
              if (self.hide) self.hide(); else app.modal.close();
              m.redraw();
            },
            function (err) {
              self.loading = false;
              log('lưu EXP lỗi:', err);
              m.redraw();
            }
          );
        }
        // Modal kiểu cũ bọc nội dung trong <form>; kiểu mới (2.0) thì không có form
        onsubmit(e) {
          if (e && e.preventDefault) e.preventDefault();
          this.save();
        }
      };
      return LevelModal;
    }

    function safe(name, fn) {
      try { fn(); } catch (e) { log('hook "' + name + '" lỗi:', e); }
    }

    app.initializers.add('kuma-develop-level', function () {
      safe('badge-trong-bai-viet', function () {
        extend(CommentPost.prototype, 'headerItems', function (items) {
          try {
            var b = badge(this.attrs.post.user());
            if (b) items.add('level', b, 90);
          } catch (e) { log('render badge lỗi:', e); }
        });
      });

      safe('the-thanh-vien', function () {
        extend(UserCard.prototype, 'infoItems', function (items) {
          try {
            var d = info(this.attrs.user);
            if (!d) return;
            var color = safeColor(d.cfg.color);
            var pct = progress(d);
            var nm = levelName(d.cfg);
            var label = [iconEl(d.cfg, 'LevelBadge-icon'), t('forum.card_level', { level: d.level }) + (nm ? ' · ' + nm : '') + ' · ' + expText(d)];

            items.add('level', m('span.LevelInfo', [
              m('span.LevelInfo-label', label),
              m('div.LevelInfo-bar', m('div.LevelInfo-fill', { style: 'width:' + pct + '%;background:linear-gradient(90deg,' + mix(color, 0, 0.25) + ',' + color + ',' + mix(color, 255, 0.35) + ')' }))
            ]), 90);
          } catch (e) { log('render the thanh vien lỗi:', e); }
        });
      });

      safe('thong-bao-len-cap', function () {
        if (!Notification) return;

        var LevelUpNotification = class extends Notification {
          icon() { return 'fas fa-star'; }
          href() {
            try {
              var u = this.attrs.notification.subject();
              return u ? app.route.user(u) : '#';
            } catch (e) { return '#'; }
          }
          content() {
            var data = {};
            try { data = this.attrs.notification.content() || {}; } catch (e) {}
            var lv = parseInt(data.level, 10) || 1;
            var L = levels();
            var cfg = L[Math.min(lv, L.length) - 1];
            var nm = cfg ? levelName(cfg) : '';
            return t('forum.notif_levelup', { level: lv, name: nm ? ' · ' + nm : '' });
          }
          excerpt() { return null; }
        };

        app.notificationComponents = app.notificationComponents || {};
        app.notificationComponents.kumaDevelopLevelUp = LevelUpNotification;

        if (NotificationGrid) {
          extend(NotificationGrid.prototype, 'notificationTypes', function (items) {
            items.add('kumaDevelopLevelUp', {
              name: 'kumaDevelopLevelUp',
              icon: 'fas fa-star',
              label: t('forum.notif_setting')
            });
          });
        }
      });

      safe('nut-chinh-cap-admin', function () {
        extend(UserControls, 'moderationControls', function (items, user) {
          try {
            if (!app.forum.attribute('kumaDevelopLevelCanEdit') && !app.forum.attribute('adminUrl')) return;
            items.add('kuma-develop-level', Button.component({
              icon: 'fas fa-star',
              onclick: function () {
                try { app.modal.show(getLevelModal(), { user: user }); } catch (e) { log('mở modal lỗi:', e); }
              }
            }, t('forum.control_edit')));
          } catch (e) { log('render nut admin lỗi:', e); }
        });
      });
    });
  }
})();
