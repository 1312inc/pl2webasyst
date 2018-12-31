(function ($) {
    'use strict';

    $.pocketlists = {
        $loading: $('<i class="icon16 loading">'),
        $wa: null,
        defaults: {
            isAdmin: false
        },
        options: {},
        updateAppCounter: function (count) {
            var self = this;

            var setIcon = function (count) {
                count = parseInt(count, 10) || '';
                var counter = self.$app_menu_pocket.find('.indicator');
                if (!counter.length) {
                    self.$app_menu_pocket.find('a').append('<span class="indicator" style="display:none;">');
                    counter = self.$app_menu_pocket.find('.indicator');
                }
            };

            if (count) {
                setIcon(count);
            } else {
                $.get('?module=json&action=appCount', function (r) {
                    if (r.status === 'ok') {
                        setIcon(r.data);
                    }
                }, 'json');
            }
        },
        scrollToTop: function (speed, offset) {
            if ($('body').scrollTop() > offset) {
                $('html,body').animate({scrollTop: offset + 'px'}, speed);
            }
        },
        highlightSidebar: function ($li) {
            var self = this;

            var $all_li = self.$core_sidebar.find('li');
            if ($li) {
                $all_li.removeClass('selected');
                $li.addClass('selected');
            } else {
                var hash = $.pocketlists_routing.getHash(),
                    $a = self.$core_sidebar.find('a[href="' + hash + '"]');

                if (hash) {
                    $all_li.removeClass('selected');
                }
                if ($a.length) { // first find full match
                    $a.closest('li').addClass('selected');
                } else { // more complex hash
                    hash = hash.split("/");
                    if (hash[1]) {
                        while(hash.length) {
                            hash.pop();
                            var href = hash.join('/');

                            var $found_li = self.$core_sidebar.find('a[href^="' + href + '"]').first().closest('li');
                            if ($found_li.length) {
                                $found_li.addClass('selected');
                                break;
                            }
                        }
                    }
                }
            }
        },
        setTitle: function (title) {
            var self = this;
            var $h1 = $('#wa-app .content h1').first();
            if ($h1.length && !title) {
                title = $h1.contents().filter(function () {
                    return this.nodeType == 3 && this.nodeValue.trim().length > 0;
                })[0].nodeValue.trim()
            }
            if (title) {
                $('title').html(title + " &mdash; " + self.options.account_name);
            }
        },
        stickyDetailsSidebar: function () {

            var $list = $('#pl-list-content');
            if ($list.length) {
                var list_top_offset = $list.offset().top,
                    _viewport_top_offset = $(window).scrollTop(),
                    _window_height = $(window).height(),
                    $el = $('.pl-details');

                if ($el.find('.fields form').height() > _window_height) {
                    return;
                }

                if (_viewport_top_offset > list_top_offset) {
                    $el.addClass('sticky');
                    var _viewport_bottom_offset = $(document).height() - _window_height - _viewport_top_offset;

                    $el.css({
                        bottom: Math.max(0, 16 - _viewport_bottom_offset),
                        right: 0
                    });
                } else {
                    $el.removeClass('sticky').css('right', 0);
                }
            }
        },
        resizeTextarea: function ($textarea) {
            if ($textarea.is(':visible')) {
                $textarea.css('height', 'auto');
                $textarea.css('height', ($textarea.get(0).scrollHeight - parseInt($textarea.css('padding-top')) - parseInt($textarea.css('padding-bottom'))) + 'px');
            }
        },
        initNotice: function (wrapper_selector) {
            var $wrapper = $(wrapper_selector);
            if (!$.storage.get('pocketlists/notice/' + wrapper_selector)) {
                $wrapper.show().one('click', '.close', function () {
                    $.storage.set('pocketlists/notice/' + wrapper_selector, 1);
                    $wrapper.slideUp();
                });
            } else {
                $wrapper.remove();
            }
        },
        reloadSidebar: function () {
            var self = this;

            $.get("?module=backend&action=sidebar", function (result) {
                $('#pl-sidebar-core').html(result);
                self.initCollapse();
                self.highlightSidebar();
                self.sortLists();
            });
        },

        sortLists: function () {
            var self = this;

            var $team_wrapper = self.$core_sidebar.find('[data-pl-sidebar-block="team"]'),
                $pocket_wrapper = self.$core_sidebar.find('[data-pl2-sidebar-wrapper="pockets"] ul:first');

            $('[data-pl-team-id]', $team_wrapper).droppable({
                accept: '[data-parent-id]',
                disabled: false,
                greedy: true,
                tolerance: 'pointer',
                classes: {
                    'ui-droppable': 'pl-droppable'
                },
                over: function (event, ui) {
                    $(this).addClass('highlighted-background');
                },
                out: function (event, ui) {
                    $(this).removeClass('highlighted-background');
                },
                drop: function (event, ui) {
                    var $item = ui.draggable,
                        $list = $(event.target),
                        team_id = $list.data('pl-team-id');

                    $item.trigger('assignTo.pl2', {id: team_id, drop: this});
                    $(this).removeClass('highlighted-background');
                    $item.addClass('pl-dropped');
                }
            });

            $('[data-pl-pocket-id]', $pocket_wrapper).droppable({
                accept: '[data-pl-list-id]',
                disabled: false,
                greedy: true,
                tolerance: 'pointer',
                classes: {
                    'ui-droppable': 'pl-droppable'
                },
                over: function (event, ui) {
                    $(this).addClass('highlighted-background');
                },
                out: function (event, ui) {
                    $(this).removeClass('highlighted-background');
                },
                drop: function (event, ui) {
                    var $list = ui.draggable,
                        $pocket = $(event.target),
                        pocket_id = $pocket.data('pl-pocket-id');

                    $list.trigger('moveTo.pl2', {id: pocket_id, drop: this});
                    $(this).removeClass('highlighted-background');
                    $list.addClass('pl-dropped');
                }
            });

            self.$core_sidebar.on('dropActionDone.pl2', '[data-pl-team-id], [data-pl-pocket-id]', function (e, data) {
                var $this = $(this);
                if (data.result) {
                    $this.addClass('pl-drop-success');
                } else {
                    $this.addClass('pl-drop-fail');
                }
                setTimeout(function () {
                    $this.removeClass('pl-drop-success pl-drop-fail');
                    // hell
                    if (data.result) {
                        setTimeout(function () {
                            $.pocketlists.reloadSidebar();
                        }, 1000);
                    }
                }, 500);

            });

            if (!self.options.isAdmin) {
                return;
            }

            $pocket_wrapper.sortable({
                item: '[data-pl-pocket-id]',
                distance: 5,
                placeholder: 'pl-list-placeholder',
                opacity: 0.75,
                appendTo: 'body',
                tolerance: 'pointer',
                classes: {
                    'ui-sortable-helper': 'shadowed'
                },
                start: function (e, ui) {
                    ui.placeholder.height(ui.helper.outerHeight());
                },
                stop: function (event, ui) {
                    var getPockets = function () {
                        var data = [];
                        $pocket_wrapper.find('[data-pl-pocket-id]').each(function (i) {
                            var $this = $(this);
                            // color = $this.attr('class').match(/pl-(.*)/);
                            data.push({
                                id: $this.data('pl-pocket-id'),
                                sort: i
                                // color: color[1]
                            });
                        });
                        return data;
                    };

                    var updateSort = function () {
                        $.post(
                            '?module=pocket&action=sort',
                            {
                                data: getPockets()
                            },
                            function (r) {
                                if (r.status === 'ok') {
                                } else {
                                    alert(r.errors);
                                }
                            },
                            'json'
                        );
                    };

                    updateSort();
                }
            });
        },
        enabled_prevent_close_browser: false,
        enable_prevent_close_browser: function ($el, msg) {
            var self = this;
            self.$core_sidebar.find('a').each(function (e) {
                if (!$(this).data('pl2-onbeforeunload')) {
                    $(this).on('click.pl2', function (e) {
                        var msg = msg || $_('You are about to leave this page without saving your input. Are you sure?');
                        if ($el) {
                            $el.data('can_blur', false);
                        }
                        if (!confirm(msg)) {
                            e.preventDefault();
                            e.stopPropagation();
                        } else {
                            self.disable_prevent_close_browser();
                        }
                    });
                }
            }).data('pl2-onbeforeunload', true);

            if (!self.enabled_prevent_close_browser) {
                self.enabled_prevent_close_browser = true;
                msg = msg || ($_('Close') + '?');
                window.onbeforeunload = function (e) {
                    if ($el) {
                        $el.data('can_blur', false);
                    }
                    return msg;
                };
            }
        },
        disable_prevent_close_browser: function () {
            var self = this;
            self.enabled_prevent_close_browser = false;
            self.$core_sidebar.find('a').off('click.pl2').removeData('pl2-onbeforeunload');
            window.onbeforeunload = function (e) {
            };
        },
        collapse: function (action) {
            var $this = $(this),
                data = $this.data('pl-collapsible'),
                $wrapper = $('[data-pl-collapsible-wrapper="' + data + '"]');

            if ($wrapper.length && action) {
                action = action === true ? ($wrapper.is(':visible') ? 'hide' : 'show') : action;
                if (action == 'show') {
                    $wrapper.show();
                    $this.addClass('darr').removeClass('rarr');
                } else if (action == 'hide') {
                    $wrapper.hide();
                    $this.addClass('rarr').removeClass('darr');
                }
                $.storage.set('pocketlists/collapsible/' + data, action);
            }
        },
        initCollapse: function () {
            var self = this;
            $('[data-pl-collapsible]')
                .off('click.pl2')
                .on('click.pl2', function (e) {
                    e.preventDefault();
                    self.collapse.call(this, true);
                })
                .each(function () {
                    var $this = $(this),
                        data = $this.data('pl-collapsible'),
                        action = $.storage.get('pocketlists/collapsible/' + data);

                    self.collapse.call(this, action);
                });
        },
        init: function (o) {
            $.pocketlists_routing.init({
                user_id: o.userId
            });

            var self = this;
            self.$app_menu_pocket = $('#wa-app-pocketlists');
            self.$core_sidebar = $('#pl-sidebar-core');
            self.options = $.extend({}, self.defaults, o);
            self.$wa = $('#wa');

            self.initCollapse();
            // self.highlightSidebar();
            // self.sortLists();

            $('#wa-app').on('click.pl2', '[data-pl-scroll-to-top] a', function () {
                self.scrollToTop(0, 80);
            });

            self.$core_sidebar.on('click', '[data-pl-action="show-all-team"]', function (e) {
                e.preventDefault();

                self.$core_sidebar.find('[data-pl-sidebar-block="team"] li').show();
                $(this).hide();
            });

            $(document)
                .on('keydown', function (e) {
                    switch (true) {
                        case e.which === 18:
                            self.$wa.addClass('pl-keypress-alt');
                            break;
                        case e.which === 16:
                            self.$wa.addClass('pl-keypress-shift');
                            break;
                    }
                }).on('keyup', function (e) {
                    switch (true) {
                        case e.which === 18:
                            self.$wa.removeClass('pl-keypress-alt');
                            break;
                        case e.which === 16:
                            self.$wa.removeClass('pl-keypress-shift');
                            break;
                    }
                });

            self.windowResize();
        },
        hasGlobalScrollbar: function () {
            return $(document).height() > $(window).height();
        },
        log: function (msg) {
            console.log('pocketlists log', msg);
        },
        flexHack: function () {
            var $compensation = $('#pl-chat-waapps-height-compensation');
            if (this.hasGlobalScrollbar() && !$compensation.is(':visible')) {
                $compensation.show();
                this.log('pl-chat-waapps-height-compensation show');
            } else if (!this.hasGlobalScrollbar() && $compensation.is(':visible')) {
                $compensation.hide();
                this.log('pl-chat-waapps-height-compensation hide');
            }
        },
        windowResize: function () {
            var self = this,
                delay = 500,
                throttled = false;

            function onResize() {
                self.flexHack();
            }

            window.addEventListener('resize', function() {
                if (!throttled) {
                    onResize();
                    throttled = true;
                    setTimeout(function() {
                        throttled = false;
                    }, delay);
                }
            });

            onResize();
        },
        scrollToEl: function(el) {
            //debugger;
            el.scrollIntoView({
                behavior: "smooth",
                block: "end",
                inline: "nearest"
            });
        }
    };
}(jQuery));
