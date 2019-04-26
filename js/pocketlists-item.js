"use strict";

/**
 * for items
 * - add
 * - complete
 * - replace
 * - drag
 */
$.pocketlists.Items = function ($list_items_wrapper, options) {
    var $undone_items_wrapper = $list_items_wrapper.find('[data-pl-items="undone"] > ul.menu-v'),
        $sortable_items = $('[data-pl-items="undone"]').find('ul.menu-v'),
        $done_items = $list_items_wrapper.find('#pl-complete-log'),
        $done_items_wrapper = $done_items.find('ul.menu-v').first(),
        item_selector = '[data-parent-id]',
        // $add_item_link = $('#pl-item-add-link'),
        $show_logbook_items = $('#pl-complete-log-link'),
        $empty_list_msg = $list_items_wrapper.find('#pl-welcome-msg'),
        $current_item = null,
        o = $.extend({}, {
            enableAddLinkOnHover: true,
            enableChangeLevel: true,
            enableSortItems: true,
            list: null,
            assignUser: null,
            showMessageOnEmptyList: false,
            dueDate: '',
            filter: false,
            archive: false,
            allowChat: true,
            current_user_id: 0,
            defaultLinkedEntity: false,
            standAloneItemAdd: false,
            appUrl: '',
            wa_url: '',
            fileUpload: 1,
            userHasLinkedApps: 0
        }, options),
        request_in_action = false;

    // todo: add wrapper around $.post $.get with request_in_action implementation

    // sortable items
    var initSortable = function () {
        if (o.enableSortItems) {
            $sortable_items.sortable({
                item: item_selector,
                handle: '[data-pl-action="item-sort"]',
                distance: 5,
                opacity: 0.75,
                appendTo: 'body',
                // connectWith: '[data-pl-items="done"] ul.menu-v',
                placeholder: 'pl-item-placeholder',
                tolerance: 'pointer',
                start: function (e, ui) {
                    ui.placeholder.height(ui.helper.outerHeight());
                },
                classes: {
                    'ui-sortable-helper': 'shadowed'
                },
                // forcePlaceholderSize: true,
                // forceHelperSize: true,
                stop: function (event, ui) {
                    var $item = ui.item;

                    if ($item.hasClass('pl-dropped')) {
                        $(this).sortable('cancel');
                        $item.removeClass('pl-dropped');
                    } else {
                        var $prev = $item.parents(item_selector).first(),
                            parent_id = $prev.length ? parseInt($prev.data('id')) : 0;

                        $item.data('parent-id', parent_id);
                        updateSort(parseInt($item.data('id')));
                    }
                }
            });
        } else {
            $(item_selector, $sortable_items).draggable({
                handle: '[data-pl-action="item-sort"]',
                distance: 5,
                opacity: 0.75,
                appendTo: 'body',
                // connectWith: '[data-pl-items="done"] ul.menu-v',
                tolerance: 'pointer',
                revert: true,
                revertDuration: 0,
                classes: {
                    'ui-sortable-helper': 'shadowed'
                }
                // forcePlaceholderSize: true,
                // forceHelperSize: true,

            });
        }
    };
    // save item
    var addItem = function (data, callback) {
        if (request_in_action) {
            return;
        }
        request_in_action = true;

        var $this = $(this),
            isTopAdd = $this.closest('[data-pl-item-add-top]').length;

        if (o.dueDate) {
            $.each(data, function (i) {
                data[i]['due_date'] = o.dueDate;
            });
        }

        if (o.defaultLinkedEntity !== false) {
            $.each(data, function (i) {
                if (data[i]['links'] === undefined) {
                    data[i]['links'] = [{model: o.defaultLinkedEntity}];
                }
            });
        }

        var $pl_done = $this.closest('.pl-item').find('.pl-done-label span').addClass('transparent').html($.pocketlists.$loading);
        $.post(
            o.appUrl + '?module=item&action=create',
            {
                list_id: o.list ? o.list.list_id : 0,
                data: data,
                assigned_contact_id: o.assignUser ? o.assignUser : false,
                filter: o.filter
            },
            function (html) {
                request_in_action = false;

                if (!o.standAloneItemAdd) {
                    $.pocketlists.updateAppCounter();
                    $.pocketlists.reloadSidebar();
                }
                $.pocketlists.$loading.remove();

                $pl_done.removeClass('transparent');

                var $li = $this.closest(item_selector),
                    $html = $('' + html + ''),
                    _itemAdd = isTopAdd ? NewItemWrapper.top_new_item : NewItemWrapper.new_item,
                    due_date = $html.data('pl-due-date');

                if (!o.enableSortItems) {
                    $html.find('[data-pl-action="item-sort"]').hide();
                }

                _itemAdd.textarea.removeData('pl2-linked-entities');

                _itemAdd.textarea.data('can_blur', false);
                if ($li.length) {
                    if (!$li.parents(item_selector).length || // not root item
                        //$li.prev(item_selector).length || // not first item in subs
                        _itemAdd.wrapper.prev('.pl-item').length) { // new item wrapper is after item
                        $li.after($html);
                    } else {
                        $li.before($html);
                    }
                } else { // added to top
                    _itemAdd.wrapper.after($html);
                }
                $html.filter(item_selector).last()
                    .find('.pl-item').first().after(_itemAdd);

                _itemAdd.textarea.val('').css('height', 'auto').data('can_blur', true);
                setTimeout(function () {
                    _itemAdd.textarea.trigger('focus');
                }, 500);

                // update calendar date with new dot
                var $calendar = $('.pl-calendar');
                if (!o.list && $calendar.length && !o.standAloneItemAdd) {
                    $.get(o.appUrl + '?module=json&action=getItemsPocketColor&id=' + parseInt($html.data('id')), function (r) {
                        if (r.status === 'ok') {
                            var $selected_date = $calendar.find('[data-pl-todo-date="' + due_date + '"]').length
                                ? $calendar.find('[data-pl-todo-date="' + due_date + '"]')
                                : false;
                            if ($selected_date) {
                                var $dots_wrapper = $selected_date.find('.pl-dots'),
                                    $new_dot = $('<i class="icon10 color pl-dark-gray">');

                                if (!$dots_wrapper.length) {
                                    $dots_wrapper = $('<div class="pl-dots">');
                                    $selected_date.append($dots_wrapper);
                                }

                                if ($dots_wrapper.find('i').not('.pl-dark-none').length < 3) {
                                    $dots_wrapper.append($new_dot);
                                }
                            }
                        }
                    }, 'json');
                }

                var $textarea_parent = _itemAdd.textarea.closest('[data-pl-item-add]') || _itemAdd.textarea.closest(item_selector),
                    $previewWrapper = $textarea_parent.find('[data-pl2-item-links]');

                $previewWrapper.empty();

                if (!o.standAloneItemAdd) {
                    hideEmptyListMessage();
                    updateListCountBadge();
                    updateSort();
                }

                $.pocketlists.sendNotifications(o.appUrl);

                $.isFunction(callback) && callback.call($this);
            }
        );
    };
    // update item
    var updateItem = function ($form, callback) {
        var item_id = $form.find('#pl-item-list-id').val(),
            item_list_id = $form.find('#pl-item-list-id').val(),
            item_list_id_new = $form.find('[name="item\[list_id\]"]').val();

        var afterUpdateItem = function (html, callback) {
            if (!o.standAloneItemAdd) {
                $.pocketlists.updateAppCounter();
                $.pocketlists.reloadSidebar();
            }

            $.pocketlists.$loading.remove();
            replaceItem(html);
            // update indicator color
            if (o.list) {
                var priority = 0,
                    list_priority = 0,
                    $list_count = $('#pl-lists').find('[data-pl-list-id="' + o.list.list_id + '"] span.count');

                var priority_class = {
                        'green': 1,
                        'pl-green': 1,
                        'pl-due-tomorrow': 1,
                        'yellow': 2,
                        'pl-yellow': 2,
                        'pl-due-today': 2,
                        'red': 3,
                        'pl-red': 3,
                        'pl-due-overdue': 3,
                        'none': 0,
                        'pl-none': 0,
                        'pl-due-someday': 0,
                        'undefined': 0
                    },
                    class_priority = {
                        1: ' indicator green',
                        2: ' indicator yellow',
                        3: ' indicator red',
                        4: ' indicator red',
                        5: ' indicator red',
                        0: ''
                    };

                // item moved to another
                if (item_list_id != item_list_id_new) {
                    // update other list count && indicator color
                    var $other_list_count = $('#pl-lists').find('[data-pl-list-id="' + item_list_id_new + '"] span.count'),
                        other_list_count = parseInt($other_list_count.text()),
                        other_list_priority = 0,
                        other_list_class = $other_list_count.attr('class').match(/count\sindicator\s(.+)/),
                        other_list_items = getItems($('<div>').html($current_item));

                    $.each(other_list_items, function () {
                        other_list_priority = Math.max(other_list_priority, this.priority);
                    });

                    $other_list_count.text(other_list_count + other_list_items.length);
                    $other_list_count.removeClass().addClass('count' + class_priority[Math.max(other_list_priority, (other_list_class ? priority_class[other_list_class[1]] : 0))]);

                    removeItem($form.find('input[name="item\[id\]"]').val());
                    updateListCountBadge();
                }

                $.each(getItems(), function () {
                    priority = Math.max(priority, this.priority);
                });
                // don't forget about list priority
                var $list_due = o.list.$el.find('[data-pl-list="due-date"]');
                if ($list_due.length && $list_due.is(':visible')) {
                    list_priority = priority_class[$list_due.attr('class').match(/bold\s(pl-.*)/)[1]];
                }

                $list_count.removeClass().addClass('count' + class_priority[Math.max(priority, list_priority)]);
            }
            $.isFunction(callback) && callback.call();
        };

        var _iframePost = function ($form, callback) {
            if (request_in_action) {
                return;
            }
            request_in_action = true;


            var form_id = $form.attr('id'),
                iframe_id = form_id + '-iframe';

            // add hidden iframe if need
            if (!$('#' + iframe_id).length) {
                $form.after("<iframe id=" + iframe_id + " name=" + iframe_id + " style='display:none;'></iframe>");
            }

            var $iframe = $('#' + iframe_id);
            $form.attr('target', iframe_id);

            $iframe.one('load', function () {
                var html = $(this).contents().find('body').html();
                afterUpdateItem(html, callback);
                request_in_action = false;
            });
        };
        //var _ajaxPost = function ($form, callback) {
        //    $.post('?module=item&action=data', $form.serialize(), function (html) {
        //        afterUpdateItem(html, callback);
        //    });
        //};

        _iframePost($form, callback);
    };
    // get all items list
    var getItems = function ($items_wrapper) {
        $items_wrapper = $items_wrapper || $undone_items_wrapper;
        var data = [];
        $items_wrapper.find(item_selector).each(function (i) {
            var $this = $(this),
                $pldone = $this.find('.pl-done'),
                priority = $pldone.length ? parseInt($pldone.data('pl2-item-priority')) : 0;

            data.push({
                id: $this.data('id'),
                parent_id: $this.data('parent-id'),
                sort: i,
                has_children: $this.find(item_selector).length ? 1 : 0,
                priority: priority
            });
        });
        return data;
    };
    // update sort base on current positions
    var updateSort = function (id) {
        //this.find('label').first().append($.pocketlists.$loading);
        if (o.enableSortItems && o.list) {
            if (request_in_action) {
                return;
            }
            request_in_action = true;

            $.post(
                o.appUrl + '?module=item&action=sort',
                {
                    list_id: o.list.list_id,
                    item_id: id ? id : 0,
                    data: getItems()
                },
                function (r) {
                    if (r.status === 'ok') {
                        initSortable();
                    } else {
                        alert(r.errors);
                    }
                    //$.pocketlists.$loading.remove();
                    request_in_action = false;
                },
                'json'
            );
        }
    };
    // complete/uncomplete items
    var completeItem = function ($item, status, callback) {
        var id = parseInt($item.data('id')),
            $assigned_user_icon = $item.find('.pl-done-label').find('.icon16.userpic20'),
            $item_data_wrapper = $item.find('.pl-item'),
            $checkbox = $(this);

        if (status && $item_data_wrapper.data('pl-assigned-contact') && $item_data_wrapper.data('pl-assigned-contact') != o.current_user_id) {
            if (!confirm($_('This to-do is assigned to another person. Are you sure you want to mark this item as complete?'))) {
                $checkbox.prop('checked', false); // uncheck
                callback && $.isFunction(callback) && callback.call($item);
                return;
            }
        }

        $item_data_wrapper.toggleClass('gray');
        $assigned_user_icon.hide();
        $.post(
            o.appUrl + '?module=item&action=complete',
            {
                id: id,
                status: status
            },
            function (r) {
                if (r.status === 'ok') {
                    if (!o.standAloneItemAdd) {
                        $.pocketlists.updateAppCounter();
                    }
                    // remove from undone list
                    $checkbox.prop('checked', status); // check nesting items
                    setTimeout(function () {
                        $item.slideToggle(200, function () {
                            $assigned_user_icon.show();

                            if (status) {
                                if ($done_items_wrapper.length) {
                                    $done_items_wrapper.prepend($item);
                                    $item.show();
                                }
                                $item.find('.pl-reply').hide();
                            } else {
                                $undone_items_wrapper.length && $undone_items_wrapper.append($item.show());
                                $item.find('.pl-reply').show();
                                updateSort();
                            }

                            // always update list count icon
                            updateListCountBadge();
                            $show_logbook_items.show().find('i').text($_('Show all %d completed to-dos').replace('%d', $done_items_wrapper.find('[data-id]').length)); // update "complete items" heading

                            if (!o.standAloneItemAdd) {
                                $.pocketlists.reloadSidebar();
                            }

                            showEmptyListMessage();

                            $.pocketlists.sendNotifications(o.appUrl);

                            callback && $.isFunction(callback) && callback.call($item);
                        });
                    }, 800);

                } else {
                    $assigned_user_icon.show();
                    alert(r.errors);
                }
                $.pocketlists.$loading.remove();
            },
            'json'
        );
    };
    // increase item level
    var increaseItem = function (e) {
        //var $items = $undone_items_wrapper.find('.pl-item-selected').closest(item_selector);
        if (o.enableChangeLevel && $current_item) {
            e.preventDefault();
            e.stopPropagation();
            $current_item.each(function () {
                var $item = $(this),
                    $prev = $item.prev(item_selector);
                if ($prev.length) { // not first
                    var parent_id = parseInt($prev.data('id'));
                    $item.data('parent-id', parent_id); // update parent id

                    var $nested = $prev.find('ul.menu-v').first();
                    if ($nested.length) {
                        $nested.append($item);
                    } else {
                        $prev.append($('<ul class="menu-v">').html($item));
                    }

                    updateSort(parseInt($item.data('id')));
                }
            });
        }
    };
    // decrease item level
    var decreaseItem = function (e) {
        //var $items = $undone_items_wrapper.find('.pl-item-selected').closest(item_selector);
        if (o.enableChangeLevel && $current_item) {
            e.preventDefault();
            e.stopPropagation();
            $current_item.each(function () {
                var $item = $(this),
                    $prev = $item.parents(item_selector).first();
                if ($prev.length) { // not first level
                    var parent_id = parseInt($prev.data('parent-id'));

                    $item.data('parent-id', parent_id); // update parent id

                    var $items_same_level = $item.nextAll(), // all next items on same level
                        $item_children_wrapper = $item.find('ul.menu-v'); // item children wrapper

                    if (!$item_children_wrapper.length) { // create if not exist
                        $item_children_wrapper = $('<ul class="menu-v">');
                        $item.append($item_children_wrapper);
                    }
                    $item_children_wrapper.append($items_same_level); // now will be children of current

                    $prev.after($item);

                    updateSort(parseInt($item.data('id')));
                }
            });
        }
    };
    // favorite item
    var favoriteItem = function ($item) {
        if (request_in_action) {
            return;
        }
        request_in_action = true;

        var $star = $item.find('[class*="star"]'),
            id = parseInt($item.data('id')),
            status = $star.hasClass('star-empty') ? 1 : 0;
        $.post(
            o.appUrl + '?module=item&action=favorite',
            {
                id: id,
                status: status
            },
            function (r) {
                if (r.status === 'ok') {
                    var $favorites_count = $('[data-pl-sidebar="favorites-count"]'),
                        current_favorites_count = $favorites_count.text();

                    current_favorites_count = current_favorites_count.length && parseInt(current_favorites_count) ? parseInt(current_favorites_count) : 0;
                    if (status && current_favorites_count >= 0) {
                        current_favorites_count++;
                    } else if (!status && current_favorites_count > 0) {
                        current_favorites_count--;
                    }
                    $favorites_count.text(current_favorites_count == 0 ? '' : current_favorites_count);
                    $star.toggleClass('star-empty star');
                } else {
                    alert(r.errors);
                }
                request_in_action = false;
                //$.pocketlists.$loading.remove();
            },
            'json'
        );
    };
    // select clicked item
    var selectItem = function ($item) {
        $current_item = $item;
        if ($current_item) {
            var $item_data_wrapper = $current_item.find('.pl-item').first();

            $list_items_wrapper.find('.pl-item').removeClass('pl-item-selected'); // remove selected class from all items
            $item_data_wrapper.addClass('pl-item-selected'); // add to currently clicked item
            $current_item.prop('checked', true);
        }
    };
    // deselect clicked item
    var deselectItem = function () {
        if ($current_item) {
            $list_items_wrapper.find('.pl-item').removeClass('pl-item-selected');
            $current_item.prop('checked', false);
            $current_item = null;
        }
    };
    // remove item row
    var removeItem = function (id) {
        $list_items_wrapper.find('[data-id="' + id + '"]').remove();
    };
    var replaceItem = function (data) {
        if ($current_item) {
            var setContent = function () {
                $current_item.find('.pl-item').first().replaceWith($(data).addClass('pl-item-selected'));
            };

            if (ItemDetails.isVisible()) {
                ItemDetails.trigger('hide.pl2', setContent);
            } else {
                setContent();
            }
        }
    };
    var updateListCountBadge = function () {
        if (o.list && o.list.list_id) {
            $('#pl-lists')
                .find('[data-pl-list-id="' + o.list.list_id + '"]')
                .find('.count').text($undone_items_wrapper.find('[data-id]').length);
        }
    };
    var isEmptyList = function () {
        return getItems().length ? false : true;
    };
    var isNewList = function () {
        return o.list && o.list.list_id < 0;
    };
    var showEmptyListMessage = function () {
        if (isEmptyList() && o.showMessageOnEmptyList) {
            $empty_list_msg.show();
            //$('.pl-title h1').css('opacity','0.25');
        }
    };
    var hideEmptyListMessage = function () {
        if (o.showMessageOnEmptyList) {
            $empty_list_msg.hide();
            //$('.pl-title h1').css('opacity','1');
        }
    };

    var moveToList = function (list_id, toList) {
        if (request_in_action) {
            return;
        }
        request_in_action = true;

        var $this = $(this);

        return $.post(
            o.appUrl + '?module=item&action=moveToList',
            {
                id: parseInt($this.data('id')),
                list_id: list_id
            },
            function (r) {
                // $.pocketlists.$loading.removeAttr('style').remove();
                var $toList = $(toList);
                var currentCount = parseInt($toList.find('.count').text());
                if (r.status === 'ok') {
                    $this.hide(200, function () {
                        $this.remove();
                    });
                    $toList.addClass('pl-drop-success');
                    if (o.list && o.list.list_id) {
                        var $fromList = $toList.parent().find('[data-pl-list-id="' + o.list.list_id + '"]'),
                            currentCountOld = parseInt($fromList.find('.count').text());

                        $toList.find('.count').text(currentCount + 1);
                        $fromList.find('.count').text(currentCountOld - 1);
                    }
                } else {
                    $this.addClass('pl-drop-fail');
                }
                // $(drop).trigger('dropActionDone.pl2', {result: r.status === 'ok'});

                setTimeout(function () {
                    $toList.removeClass('pl-drop-success pl-drop-fail');
                }, 500);

                request_in_action = false;
            },
            'json'
        );
    };
    var assignTo = function (team_id, drop) {
        if (request_in_action) {
            return;
        }
        request_in_action = true;

        var $this = $(this);

        return $.post(
            o.appUrl + '?module=item&action=assignTo',
            {
                id: parseInt($this.data('id')),
                team_id: team_id
            },
            function (r) {
                // $.pocketlists.$loading.removeAttr('style').remove();
                if (r.status === 'ok') {
                    if ($this.find('.pl-item').data('pl-assigned-contact') === undefined) {
                        $this.find('.pl-item-name').after('<strong class="hint"><br>' + $_('Assigned to') + ' ' + r.data + '</strong>');
                    } else {
                        $this.find('.pl-item-name + .hint').html('<br>' + $_('Assigned to') + ' ' + r.data);
                    }
                    $this.find('.pl-item').data('pl-assigned-contact', team_id);

                    $.pocketlists.sendNotifications(o.appUrl);
                }
                $(drop).trigger('dropActionDone.pl2', {
                    $obj: $this,
                    result: r.status === 'ok'
                });
                request_in_action = false;
            },
            'json'
        );
    };

    var itemLinkerCache = (function () {
        var cache = [],
            ttl = 100;

        var now = function () {
            return Date.now() / 1000 | 0;
        };

        return {
            get: function (key, f) {
                if (cache[key] && (cache[key]['time'] + ttl > now())) {
                    return cache[key]['value'];
                }
                return null;
            },
            set: function (key, value) {
                cache[key] = {
                    time: now(),
                    value: value
                };
            }
        }
    }());

    var ItemLinker = function ($textarea) {
        if (!o.userHasLinkedApps) {
            return;
        }

        // if ($textarea.data('pl2-itemlinker')) {
        //     return;
        // }

        var itemText = $textarea.val(),
            $parent = findParent();

        if (!$parent) {
            window.console && console.log('error in ItemLinker parent find');

            return;
        }

        var $previewWrapper = $parent.find('[data-pl2-item-links]'),
            linkedEntities = $textarea.data('pl2-linked-entities');

        function findParent() {
            // debugger;

            var $parents = [$textarea.closest('#pl-item-details-form'), $textarea.closest('[data-pl-item-add]'), $textarea.closest(item_selector)],
                $parent = null;

            for (var i = 0; i < $parents.length; i++) {
                if ($parents[i].length) {
                    $parent = $parents[i];

                    break;
                }
            }

            return $parent;
        }

        // $textarea.data('pl2-itemlinker', true);

        var log = function (msg) {
            window.console && console.log('pl2 autocomplete', msg);
        };

        var canShowAutocomplete = function () {
            log('canShowAutocomplete');

            itemText = $textarea.val();

            if (!itemText) {
                log('no text');

                return false;
            }

            if (!/(^| )(@|#|№)/.test(itemText)) {
                log('no @|#|№');

                return false;
            }

            // var cursorPos = doGetCaretPosition($textarea[0]);
            var cursorPos = $textarea.prop("selectionStart");

            var equalTrigger = function(text) {
                return text === '@' || text === '#' || text === '№';
            };

            for (var i = cursorPos; !equalTrigger(itemText[i]) && i >= 0; i--) {
                if (itemText[i] == ' ') {
                    return false;
                }
            }

            for (var j = cursorPos; itemText[j] != ' ' && j < itemText.length; j++) {
            }

            var term = itemText.slice(i + 1, j);

            return term;
        };

        if ($textarea.data('autocomplete')) {
            $textarea.autocomplete('destroy');
            $textarea.removeData('autocomplete')
        }
        $textarea.autocomplete({
            // html:true,
            // autoFocus: true,
            source: function (request, response) {
                var term = canShowAutocomplete();

                if (term === '') {
                    return response([{
                        'value': '',
                        'label': '<em>' + $_('Find order by ID') + '</em>'
                    }]);
                }

                var plresponse = function (data) {
                    if (data.status != 'ok') {
                        return [];
                    }

                    var results = [];

                    $.each(data.data, function (i, typeResults) {
                        log(typeResults);

                        if (!typeResults) {
                            return;
                        }

                        $.each(typeResults.entities, function (i, entity) {
                            results.push(entity)
                        });
                    });

                    itemLinkerCache.set(term, results);

                    return response(results)
                };

                var results = itemLinkerCache.get(term);

                if (results) {
                    response(results);
                } else {
                    $.getJSON(o.appUrl + '?module=item&action=linkAutocomplete', {
                        term: term
                    }, plresponse);
                }
            },
            focus: function () {
                // prevent value inserted on focus
                return false;
            },
            select: function (event, ui) {
                var linked = $textarea.data('pl2-linked-entities') || {},
                    link = ui.item.data,
                    hash = link.model.app + link.model.entity_type + link.model.entity_id;

                if (linked[hash] === undefined) {
                    linked[hash] = link;
                    showLinkedPreview(link);
                    $textarea.data('pl2-linked-entities', linked);
                }

                var term = canShowAutocomplete(),
                    text = $textarea.val(),
                    new_text = text.replace(new RegExp('(@|#|№)' + term), ui.item.value);

                $textarea.val(new_text);

                return false;
            },
            open: function () {
                $textarea.autocomplete('widget').css('z-index', 100);
                return false;
            },
            delay: 300,
        });

        // old jq ui hack
        if ($textarea.data("ui-autocomplete") !== undefined) {
            $textarea.data("ui-autocomplete")._renderItem = function (ul, item) {
                return $("<li>")
                    .append(item.label)
                    .appendTo(ul);
            };
        }

        $textarea
            .off('autocompleteopen').on("autocompleteopen", function (event, ui) {
                $textarea.data('pl2-autocomplete-isopen', true);
            })
            .off('autocompleteclose').on("autocompleteclose", function (event, ui) {
                $textarea.data('pl2-autocomplete-isopen', false);
            });

        var showLinkedPreview = function (link) {
            var $linkPreview = $('<div data-pl2-link-preview></div>');

            $linkPreview.html(link.preview);

            $previewWrapper.append($linkPreview).show();
        };

        function renderEntities() {
            if (linkedEntities) {
                $previewWrapper.empty();

                for(var linkedEntity in linkedEntities) {
                    showLinkedPreview(linkedEntities[linkedEntity]);
                }
            }
        }
        renderEntities();
        // $textarea.on('renderEntities.pl2', renderEntities);
    };

    /**
     * for new item dom manipulating
     */
    var NewItemWrapper = (function ($new_item_wrapper) {
        $new_item_wrapper.on('click', '[data-pl2-action="edit-new-item"]', function (e) {
            e.preventDefault();

            openItemDetailsWrapper.call(this, true);
        });

        // var $new_item_wrapper_hover = $('<div class="pl-inner-item-add-placeholder"></div>'),
        var $new_item_wrapper_hover = $('<div id="pl-item-add-wrapper-hover" style="display: none;">'),
            $top_new_item_wrapper = $new_item_wrapper.clone(true),
            $textarea = $new_item_wrapper.find('textarea'),
            $top_textarea = $top_new_item_wrapper.find('textarea');

        var hide_new_item_wrapper = function () {
            $new_item_wrapper.slideUp(200, function () {
                $new_item_wrapper.detach();
                $('.pl-new-item-wrapper').remove();
                $textarea.val('').removeClass('pl-unsaved');
                showEmptyListMessage();
            });
        };

        var init = function () {
            // if (!o.standAloneItemAdd) {
            $new_item_wrapper.detach();
            // }

            var show_new_item_wrapper = function () {
                // hideEmptyListMessage();
                $top_new_item_wrapper.prependTo($undone_items_wrapper).show().wrap('<li data-pl-item-add-top>');
                setTimeout(function () {
                    if (isEmptyList()/* && !o.showMessageOnEmptyList*/) {
                        $top_textarea.val('').trigger('focus');
                        ItemLinker($top_textarea);
                    }
                }, 500);
            };
            !isNewList() && show_new_item_wrapper();

            // handlers for both textareas (top and movable)
            $textarea.add($top_textarea)
                .on('change cut keydown drop paste', function () {
                    window.setTimeout(function () {
                        $.pocketlists.resizeTextarea($textarea)
                    }, 0);
                    window.setTimeout(function () {
                        $.pocketlists.resizeTextarea($top_textarea)
                    }, 0);
                })
                .on('keydown', function (e) {
                    var $this = $(this);
                    if (!o.standAloneItemAdd) {
                        $.pocketlists.enable_prevent_close_browser($this);
                    }
                    $this
                        .data('can_blur', true)
                        .removeClass('pl-unsaved');
                    if (!e.shiftKey && e.which === 13 && !$this.data('pl2-autocomplete-isopen')) {
                        e.preventDefault();
                        if (!o.standAloneItemAdd) {
                            $.pocketlists.disable_prevent_close_browser();
                        }

                        var parent_id = $this.closest('.menu-v').find(item_selector).first().data('parent-id'),
                            name = $this.val().trim();
                        if (name) {
                            addItem.call(this, [{
                                name: name,
                                links: $this.data('pl2-linked-entities'),
                                parent_id: parent_id
                            }]);
                        }
                    } else if (e.which === 27 && !$this.data('pl2-autocomplete-isopen')) {
                        $this.data('can_blur', false);

                        if (!o.standAloneItemAdd) {
                            $.pocketlists.disable_prevent_close_browser();
                            hide_new_item_wrapper();
                        }
                    }


                })
                .on('paste', function () {
                    var self = this,
                        $self = $(self),
                        parent_id = $self.closest('.menu-v').find(item_selector).first().data('parent-id');

                    if (!$self.val().length) {
                        setTimeout(function () {
                            var items = $self.val().split(/\n/),
                                data = [];
                            if (items.length > 1) {
                                for (var i = 0; i < items.length; i++) {
                                    var name = $.trim(items[i]);
                                    if (name) {
                                        data.push({
                                            name: name,
                                            links: [],
                                            parent_id: parent_id
                                        });
                                    }
                                }
                                addItem.call(self, data);
                            }
                        }, 100);
                    }
                })
                .on('focus', function () {
                    var $this = $(this);
                    if (!o.standAloneItemAdd) {
                        $.pocketlists.disable_prevent_close_browser();
                    }
                    $this
                        .data('can_blur', true)
                        .removeClass('pl-unsaved');
                })
                .on('blur', function () {
                    var $this = $(this),
                        name = $this.val().trim(),
                        can_blur = $this.data('can_blur');

                    if (can_blur) {
                        if (name) {
                            if (!o.standAloneItemAdd) {
                                $.pocketlists.enable_prevent_close_browser($this);
                            }
                            $this.addClass('pl-unsaved');
                        } else {
                            if (!o.standAloneItemAdd) {
                                $.pocketlists.disable_prevent_close_browser();
                            }
                            hide_new_item_wrapper();
                        }
                    }
                });

            //$wrapper.on('hide.pl2', hide_new_item_wrapper);
            if (o.enableAddLinkOnHover) {
                $undone_items_wrapper.on('click', '.pl-inner-item-add-placeholder',function (e) {
                    e.preventDefault();
                    e.stopPropagation();

                    // if item has children - place it before first
                    var $this = $(this);
                    var $has_children = $this.closest(item_selector).find('.menu-v');

                    $textarea.data('can_blur', false);
                    if ($has_children.length) { // if item has children - indent
                        $has_children.find('.pl-item').first().before($new_item_wrapper);
                    } else { // else on same level
                        $this.closest(item_selector).find('.pl-item').first().after($new_item_wrapper);
                    }
                    $new_item_wrapper_hover.detach();
                    $new_item_wrapper.slideDown(200);
                    $textarea.focus();
                });
            }

            ItemLinker($textarea);
            ItemLinker($top_textarea);
        };

        init();

        return {
            hide: hide_new_item_wrapper,
            new_item: {
                wrapper: $new_item_wrapper,
                textarea: $textarea
            },
            top_new_item: {
                wrapper: $top_new_item_wrapper.closest('[data-pl-item-add-top]'),
                textarea: $top_textarea
            }
        }
    }($('[data-pl-item-add]')));

    /**
     * for item details
     * - show/hide (p)
     * - change details
     */
    var ItemDetails = (function ($wrapper) {
        var itemId = 0,
            $currentItem = null,
            serializedForm = '';

        var showLoading = function ($item) {
            if (itemId) {
                $item.find('.pl-edit').addClass('pl-non-opacity').html($.pocketlists.$loading);
            } else {
                $item.find('[data-pl2-action="edit-new-item"] .ellipsis').toggleClass('pl ellipsis loading')
            }
        };

        var isOpen = function () {
            return $currentItem !== null;
        };

        var setItem = function ($item) {
            $currentItem = $item;
            serializedForm = '';

            itemId = $currentItem ? parseInt($item.data('id')) || 0 : 0;
        };

        var hideItemDetails = function (e, callback) {
            if ($currentItem) {

                if (!itemId) {
                    var $addItemTextarea = $currentItem.find('[data-pl2-item-textarea]');
                    $currentItem.find('[data-pl2-item-links]').show();
                    $addItemTextarea.val($wrapper.find('[name="item[name]"]').val());

                    $addItemTextarea.data('pl2-linked-entities', $wrapper.find('[name="item[name]"]').data('pl2-linked-entities'));
                    // $addItemTextarea.trigger('renderEntities.pl2');
                    ItemLinker($addItemTextarea);
                }

                // $wrapper.slideToggle(0, function () {
                $wrapper.hide().empty().detach();
                // });

                var $selectLabel = $currentItem.find('.pl-select-label');
                if (!$selectLabel.is(':visible')) {
                    $selectLabel.show();
                }

                $currentItem
                    .find('.pl-meta')
                    .css({'position': 'absolute'})
                    .show()
                    .animate({'opacity': '1'}, 0, function () {
                        $(this).css({'position': 'relative'})
                    })
                    .end()
                    .find('.pl-edit')
                    .removeClass('pl-non-opacity')
                    .html('<i class="icon16 pl ellipsis"></i>');

                setItem(null);
            }

            if ($.isFunction(callback)) {
                callback.call();
            }

            // $list_items_wrapper.trigger('deselectItem.pl2');
        };

        var listIsVisible = function () {
            return o.list && o.list.list_details.isVisible();
        };

        var showItemDetails = function (e, $item, callback) {
            if (request_in_action) {
                return;
            }
            request_in_action = true;

            var loadDetails = function () {
                setItem($item);

                //$wrapper.html($.pocketlists.$loading).show();
                // $(window).scrollTop();
                // if (listIsVisible()) {
                //     o.list.list_details.$el.after($wrapper);
                // }

                showLoading($currentItem);

                $.post(o.appUrl + '?module=item&action=details', {
                    id: itemId,
                    list_id: o.list && o.list.list_id ? o.list.list_id : 0,
                    assign_user_id: o.assignUser || 0
                }, function (html) {
                    $wrapper
                        .html(html)
                        .show();

                    var labelH = $item.find('.pl-select-label').height();

                    $wrapper
                        .css({'max-height': labelH + 18 + 'px'}, 200)
                        .animate({'max-height': 999 + 'px'}, 200)
                        .animate({}, 200, function () {
                            if (listIsVisible()) {
                                o.list.list_details.trigger('hide.pl2');
                            }

                            $.pocketlists.stickyDetailsSidebar();
                        });

                    afterLoad();

                    if ($.isFunction(callback)) {
                        callback.apply();
                    }

                    request_in_action = false;

                    $.pocketlists.flexHack();
                });
            };

            if (isOpen()) {
                hideItemDetails();
            }

            loadDetails();
        };

        var afterLoad = function () {
            var initDatepicker = function () {
                var datepicker_options = {
                    changeMonth: true,
                    changeYear: true,
                    shortYearCutoff: 2,
                    dateShowWeek: false,
                    showOtherMonths: true,
                    selectOtherMonths: true,
                    stepMonths: 1,
                    numberOfMonths: 1,
                    gotoCurrent: true,
                    constrainInput: false,
                    dateFormat: "yy-mm-dd",
                    onClose: function () {
                        if ($wrapper.find('#pl-item-due-datetime').val()) {
                            if (!$wrapper.find('#pl-item-due-datetime-clear').is(':visible')) {
                                $wrapper.find('#pl-item-due-datetime-set').show();
                            }
                        } else {
                            $wrapper.find('#pl-item-due-datetime-set, #pl-item-due-datetime-hours, #pl-item-due-datetime-minutes, #pl-item-due-datetime-clear').hide()
                        }
                    },
                    beforeShow: function() {
                        var $this = $(this),
                            dp = $this.datepicker('widget');

                        setTimeout(function () {
                            dp.css('z-index', 100);
                        }, 0);
                    }
                };

                $wrapper.find('#pl-item-due-datetime').datepicker(datepicker_options);
            };

            initDatepicker();

            var initFileUpload = function () {
                $wrapper.find('[data-pl-item-details-fileupload]').fileupload({
                    url: o.appUrl + '?module=item&action=addAttachment',
                    dataType: 'json',
                    autoUpload: true,
                    dropZone: '[data-pl-item-details-fileupload]',
                    formData: {
                        item_id: itemId
                    },
                    done: function (e, data) {
                        var $attachments = $wrapper.find('[data-pl-item-details-attachments]');
                        if (data.result.errors) {
                            alert(data.result.errors[0]);
                            return;
                        }
                        $.each(data.result.data.files, function (index, file) {
                            $attachments.find('ul').append('<li>' +
                                '<a href="' + file.path + '/' + file.name + '" target="_blank">' + file.name + '</a> ' +
                                '<a href="#" class="gray" data-pl-attachment-name="' + file.name + '" style="margin-left: 10px;" title="' + $_('Delete') + '" style="margin-left: 10px;">&times;</a>' +
                                '</li>');
                        });
                    },
                    progressall: function (e, data) {
                        var progress = parseInt(data.loaded / data.total * 100, 10);
                        $wrapper.find('#progress .progress-bar').css(
                            'width',
                            progress + '%'
                        );
                    }
                });
            };

            if (o.fileUpload) {
                if (!$.fn.fileupload) {
                    $.when(
                        $.getScript(o.wa_url + "wa-content/js/jquery-plugins/fileupload/jquery.iframe-transport.js"),
                        $.getScript(o.wa_url + "wa-content/js/jquery-plugins/fileupload/jquery.fileupload.js"),
                        $.Deferred(function (deferred) {
                            $(deferred.resolve);
                        })
                    ).done(function () {
                        initFileUpload();
                    });
                } else {
                    initFileUpload();
                }
            }

            serializedForm = $wrapper.find('form').serialize();

            $wrapper.find('textarea').trigger('change');

            var $name = $wrapper.find('[name="item[name]"]');

            $name.trigger('focus');
            var nameValue = $name.val();

            if (!itemId) {
                nameValue = $currentItem.find('[data-pl2-item-textarea]').val();
                $currentItem
                    .find('[data-pl2-action="edit-new-item"] .loading').toggleClass('pl ellipsis loading')
                    .end()
                    .find('[data-pl2-item-links]').hide();
            }

            $name.val('').val(nameValue);

            $wrapper.find('#pl-assigned-contact select').trigger('change');

            $name.data('pl2-linked-entities', $currentItem.find('[data-pl2-item-textarea]').data('pl2-linked-entities'));

            ItemLinker($name);
        };

        var init = function () {
            if ($wrapper.data('pl-ItemDetails')) {
                return;
            }

            $wrapper
                .data('pl-ItemDetails', true)
                .on('show.pl2', showItemDetails)
                .on('hide.pl2', hideItemDetails)
                .on('submit', 'form', function () {
                    //e.preventDefault();
                    var $form = $(this),
                        $name = $form.find('[name="item[name]"]'),
                        links = $name.data('pl2-linked-entities');

                        $form.find('#pl-item-details-save').after($.pocketlists.$loading);
                    if (itemId) {
                        if (links) {
                            var link_i = 0;
                            for (var linked in links) {
                                for (var key in links[linked]['model']) {
                                    $form.append($('<input name="item[links]['+link_i+'][model]['+key+']" type="hidden">').val(links[linked]['model'][key]));
                                }
                                link_i++;
                            }
                        }

                        $name.removeData('pl2-linked-entities');

                        updateItem($form);
                    } else {
                        var formValues = JSON.parse(JSON.stringify($form.serializeArray())),
                            data = {};

                        $.each(formValues, function () {
                            data[this.name.replace('item[','').replace(']','')] = this.value;
                        });

                        if (links) {
                            data['links'] = links;
                        }

                        addItem.call($currentItem.find('[data-pl2-item-textarea]').get(0), [data], function () {
                            $form.trigger('reset');
                            $currentItem.find('[data-pl2-item-textarea]').removeData('pl2-linked-entities');
                            $name.removeData('pl2-linked-entities');
                            hideItemDetails();
                        });

                        return false;
                    }
                })
                .on('click', '.pl-item-details-cancel', function (e) {
                    e.preventDefault();

                    hideItemDetails();
                })
                .on('click', '#pl-item-priority a', function (e) {
                    e.preventDefault();

                    $wrapper
                        .find('#pl-item-priority input')
                            .val($(this).data('pl-item-priority'))
                            .trigger('change');

                    $(this)
                        .addClass('selected')
                        .siblings()
                            .removeClass('selected')
                })
                .on('click', '#pl-item-due-datetime-set', function (e) {
                    e.preventDefault();

                    $(this)
                        .hide()
                        .siblings()
                            .show()
                            .filter('select')
                                .prop('disabled', false);
                })
                .on('click', '#pl-item-due-datetime-clear', function (e) {
                    e.preventDefault();

                    $(this)
                        .hide()
                        .siblings()
                            .show()
                            .filter('select')
                                .hide()
                                .prop('disabled', true);
                })
                .on('click', '[data-pl-action="item-delete"]', function (e) {
                    e.preventDefault();
                    var $dialog_confirm = $('#pl-dialog-delete-item-confirm');

                    if ($dialog_confirm.hasClass('dialog')) {
                        $('body').append($dialog_confirm.show());
                    } else {
                        $dialog_confirm.waDialog({
                            'height': '140px',
                            'min-height': '140px',
                            'width': '400px',
                            onLoad: function () {
                                //var $d = $(this);
                                //$d.find('h1').text($wrapper.find('input[name="item[name]"]').val());
                                $('body').append($(this));
                            },
                            onSubmit: function (d) {
                                if (request_in_action) {
                                    return;
                                }
                                request_in_action = true;

                                $.post(o.appUrl + '?module=item&action=delete', {id: itemId}, function (r) {
                                    if (r.status === 'ok') {
                                        d.trigger('close');
                                        hideItemDetails(null, function () {
                                            removeItem(r.data.id);
                                            $list_items_wrapper.find('[data-id="' + r.data.id + '"]').remove();
                                            updateListCountBadge();
                                        });
                                    } else {

                                    }
                                    request_in_action = false;
                                }, 'json');
                                return false;
                            },
                            onClose: function () {
                                $wrapper.append($(this));
                            }
                        });
                    }
                })
                .on('change', '#pl-assigned-contact select', function () {
                    var assigned_contact_id = parseInt($(this).val());

                    if (assigned_contact_id) {
                        $wrapper.find('#pl-assigned-contact [data-pl-contact-id="' + assigned_contact_id + '"]')
                            .show()
                            .siblings()
                            .hide();
                    } else {
                        $wrapper.find('#pl-assigned-contact [data-pl-contact-id]').hide()
                    }
                })
                .on('change paste keyup', ':input', function () {
                    $wrapper.find('#pl-item-details-save')
                        .removeClass('yellow green')
                        .addClass($wrapper.find('form').serialize() !== serializedForm ? 'yellow' : 'green');
                })
                .on('change', '#pl-item-pocket', function () {
                    if (request_in_action) {
                        return;
                    }
                    request_in_action = true;

                    $(this).after($.pocketlists.$loading);
                    $.get(o.appUrl + '?module=json&action=getLists', function (r) {
                        $.pocketlists.$loading.remove();
                        var $pocket_lists = $('#pl-item-list');
                        $pocket_lists.empty();
                        if (r.status === 'ok') {
                            $.each(r.data, function () {
                                $pocket_lists.append($('<option value="' + this.id + '">').text(this.name));
                            });
                        } else {
                            $pocket_lists.append('<option value="" selected="selected">' + $_('None') + '</option>');
                        }
                        $pocket_lists.trigger('change');
                        request_in_action = false;
                    }, 'json');
                })
                .on('change', '#pl-item-list', function () {
                    var item_id = $(this).find(':selected').val();
                    $wrapper.find('input[name="item\[list_id\]"]').val(item_id);
                    if (item_id) {
                        $(this).show();
                        $wrapper.find('#pl-null-list-msg').hide();
                    } else {
                        $(this).hide();
                        $wrapper.find('#pl-null-list-msg').show();
                    }
                })
                .on('click', '[data-pl-attachment-name]', function (e) {
                    e.preventDefault();

                    if (!confirm($_('Are you sure you want to delete this file?'))) {
                        return false;
                    }

                    var $this = $(this),
                        attachment_name = $this.data('pl-attachment-name'),
                        $w = $this.closest('li');

                    $.post(o.appUrl + '?module=item&action=deleteAttachment', {
                        attachment: attachment_name,
                        item_id: itemId
                    }, function (r) {
                        if (r.status === 'ok') {
                            $w.hide(200, function () {
                                $w.remove();
                            });
                        }
                    }, 'json');
                })
                .on('change cut keydown drop paste', 'textarea', function () {
                    var $textarea = $(this);

                    window.setTimeout(function () {
                        $.pocketlists.resizeTextarea($textarea)
                    }, 0);
                });

            return this;
        };

        init();

        return {
            $el: $wrapper,
            trigger: function (event, data) {
                this.$el.trigger(event, data);
            },
            isVisible: function () {
                return this.$el.is(':visible');
            }
        };
    }($('#pl2-item-details')));

    var ItemComments = (function ($w) {
        var id = 0,
            $wrapper = $w;

        var countComments = function () {
            return $wrapper.find('[data-pl-comment-id]').length;
        };

        var updateCommentsCount = function () {
            $list_items_wrapper.find('.pl-item-wrapper[data-id="' + id + '"] .pl-comment-count')
                .addClass('pl-comment-count-show')
                .html('<i class="icon16 pl comments"></i>' + countComments());
        };

        var addComment = function (data) {
            if (request_in_action) {
                return;
            }
            request_in_action = true;

            var $this = $(this),
                $reply_wrapper = $this.closest('.pl-reply'),
                $userpic = $reply_wrapper.find('.icon16');

            $userpic.hide();
            $reply_wrapper.prepend($.pocketlists.$loading.css({
                'margin-top': 1,
                'margin-left': 12
            }));
            $.post(
                o.appUrl + '?module=comment&action=add',
                {
                    item_id: id,
                    comment: data.comment
                },
                function (html) {
                    $.pocketlists.$loading.removeAttr('style').remove();
                    $userpic.show();

                    $wrapper.find('.pl-chat-contents').append(html);

                    updateCommentsCount();

                    $this.val('').trigger('focus');
                    $.pocketlists.resizeTextarea($this);

                    $.pocketlists.scrollToEl($wrapper.find('.pl-chat-contents [data-pl-comment-id]:last')[0]);

                    $.pocketlists.sendNotifications(o.appUrl);

                    request_in_action = false;
                }
            );
        };

        var deleteComment = function () {
            if (!confirm($_('You are about to permanently delete this comment. Delete?'))) {
                return;
            }

            if (request_in_action) {
                return;
            }
            request_in_action = true;

            var $this = $(this),
                $comment_wrapper = $this.closest('[data-pl-comment-id]'),
                comment_id = $comment_wrapper.data('pl-comment-id');

            $.post(
                o.appUrl + '?module=comment&action=delete',
                {
                    id: comment_id
                },
                function (r) {
                    $.pocketlists.$loading.removeAttr('style').remove();
                    if (r.status === 'ok') {
                        $comment_wrapper.slideUp(200, function () {
                            $comment_wrapper.remove();

                            updateCommentsCount();
                        });
                    }
                    request_in_action = false;
                },
                'json'
            );
        };

        var hideItemComments = function () {
            $wrapper.animate({
                'right': '-300px'
            }, 200, function () {
                $wrapper.hide().empty()
            });
            id = 0;
            $list_items_wrapper.trigger('deselectItem.pl2');
        };

        var showItemComments = function (id_item) {
            if (request_in_action) {
                return;
            }
            request_in_action = true;

            id = id_item;
            //$wrapper.html($.pocketlists.$loading).show();
            $(window).scrollTop();
            // o.list && o.list.list_details.isVisible() && o.list.list_details.$el.after($wrapper);
            $wrapper.html($.pocketlists.$loading).show().animate({
                'right': '0'
            }, 200, function () {
                o.list && o.list.list_details.isVisible() && o.list.list_details.trigger('hide.pl2');
                $.pocketlists.stickyDetailsSidebar();
            });
            $.post(o.appUrl + '?module=item&action=comments', {id: id}, function (html) {
                request_in_action = false;
                $wrapper.html(html);
                afterLoad();
            });
        };

        var afterLoad = function () {
            $.pocketlists.flexHack();
            var $last_comment = $wrapper.find('.pl-chat-contents [data-pl-comment-id]:last');

            if ($last_comment.length) {
                $.pocketlists.scrollToEl($wrapper.find('.pl-chat-contents [data-pl-comment-id]:last')[0]);
            }

            setTimeout(function () {
                $wrapper.find('.pl-chat .pl-reply textarea').trigger('focus');
            }, 1);
        };

        var init = function () {
            if ($wrapper.data('pl-ItemComments')) {
                return;
            }
            $wrapper.data('pl-ItemComments', true);

            //id = parseInt($wrapper.find('input[name="item\[id\]"]').val());
            $wrapper
                .on('click', '.pl-item-details-cancel', function (e) {
                    e.preventDefault();

                    hideItemComments();
                })
                .on('keydown', '.pl-chat .pl-reply textarea', function (e) {
                    var $this = $(this);
                    if (!e.shiftKey && e.which === 13) {
                        e.preventDefault();
                        var comment = $this.val().trim();
                        if (comment) {
                            addComment.call(this, {
                                comment: comment
                            });
                        }
                    } else if (e.which === 27) {
                        // hideChatCommentInput();
                        // deselectItem();
                    }

                    window.setTimeout(function () {
                        $.pocketlists.resizeTextarea($this)
                    }, 0);
                })
                .on('blur', '.pl-chat .pl-reply textarea', function (e) {
                    var $this = $(this),
                        comment = $this.val().trim();
                    if (comment) {
                        $this.addClass('pl-unsaved');
                        if (!o.standAloneItemAdd) {
                            $.pocketlists.enable_prevent_close_browser();
                        }
                    }
                })
                .on('focus', '.pl-chat .pl-reply textarea', function (e) {
                    var $this = $(this);
                    $this.removeClass('pl-unsaved');
                    if (!o.standAloneItemAdd) {
                        $.pocketlists.disable_prevent_close_browser();
                    }
                })
                .on('click', '[data-pl-action="comment-delete"]', function (e) {
                    e.preventDefault();

                    deleteComment.call(this);
                })
                .on('click', '.pl-chat .pl-reply textarea', function (e) {
                    e.preventDefault();

                    selectItem($(this).closest(item_selector));
                })
                .on('show.pl2', function (e, id) {
                    showItemComments(id);
                })
                .on('hide.pl2', hideItemComments)
            ;

            $(window).scroll(function () {
                $.pocketlists.stickyDetailsSidebar();
            });
        };

        var _getWrapper = function () {
            return $wrapper;
        };

        init();

        return {
            getWrapper: _getWrapper,
            trigger: function (event, data) {
                this.getWrapper() && this.getWrapper().trigger(event, data);
            },
            isVisible: function () {
                return this.getWrapper() ? this.getWrapper().is(':visible') : false;
            }
        };
    }($('#pl2-item-comments')));

    // ох сколько всего накручено =( vue плачет
    var openItemDetailsWrapper = function(e, brandNew) {
        var $this = $(this),
            $item = null;

        switch (true) {
            case $this.closest('[data-pl-item-add]').length > 0:
                $item = $this.closest('[data-pl-item-add]');
                break;
            // case $this.closest('[data-pl-item-add]').length:
            //     $item = $this.closest('[data-pl-item-add]');
            //     break;
            case $this.closest(item_selector).length > 0:
                $item = $this.closest(item_selector);
                break;
        }

        if ($item.data('pl-complete-datetime')) {
            return;
        }

        ItemDetails.trigger('hide.pl2', function () {
            ItemDetails.$el.appendTo($item.find('[data-pl2-item-details]'));

            ItemDetails.trigger('show.pl2', [$item, function () {
                $item.find('.pl-select-label').hide();
                $item.find('.pl-meta').animate({'opacity': '0', 'height': 0}, 200, function () {
                    $(this).hide();
                });
            }]);

            selectItem($item);
        });
    };

    var init = function () {
        //if ($.pocketlists_routing.getHash() == '#/todo/' &&
        //    $.pocketlists_routing.getHash().indexOf('/team/') > 0) {
        //    $new_item_wrapper.prependTo($undone_items_wrapper).slideDown(200).wrap('<li class="pl-new-item-wrapper">');
        //    $new_item_input.focus();
        //}

        var do_not_show_item_details = false;

        if (o.archive) {
            $list_items_wrapper.find(':checkbox').prop('disabled', true);
        }

        showEmptyListMessage();
        initSortable();

        $list_items_wrapper
        /**
         * complete/uncomplete item
         */
            .on('click', '.pl-done', function () {
                var $this = $(this),
                    $item = $this.closest(item_selector),
                    status = $this.prop('checked') ? 1 : 0;

                $this.prop('disabled', true);
                completeItem.call(this, $item, status, function () {
                    if (ItemDetails.isVisible()) {
                        ItemDetails.trigger('hide.pl2');
                    }
                    $this.prop('disabled', false);
                });
            })
            /**
             * select/deselect item
             */
            // todo: do we really need checkbox?
            .on('change', '.pl-is-selected', function (e) {
                var $this = $(this),
                    $item = $this.closest(item_selector),
                    is_selected = ($current_item && $current_item.data('id') == $item.data('id')) ? true : false,
                    item_id = parseInt($item.data('id'));

                e.preventDefault();

                if (item_id) {
                    if (!ItemDetails.isVisible() && !is_selected) { // on first click - select
                        ItemDetails.trigger('hide.pl2');
                        selectItem($item);
                    } else { // on third
                        // ItemDetails.trigger('hide.pl2');
                        // deselectItem();
                    }
                }
            }) // action: select item
            // .on('click', '.pl-edit', function (e) {
            //     e.preventDefault();
            //
            //     var $this = $(this),
            //         $item = $this.closest(item_selector);
            //
            //     ItemDetails.trigger('show.pl2', [parseInt($item.data('id'))]); // show item details
            //     selectItem($item);
            // })
            .on('click', '[data-pl-action="item-favorite"]', function (e) {
                e.preventDefault();
                var $this = $(this),
                    $item = $this.closest(item_selector);

                favoriteItem($item);
            }) // action: favorite item`
            .on('increaseSelectedItem.pl2', increaseItem)
            .on('decreaseSelectedItem.pl2', decreaseItem)
            .on('deselectItem.pl2', deselectItem)
            .on('removeItem.pl2', function (e, id) {
                removeItem(id);
            })
            .on('replaceSelectedItem.pl2', function (e, data) {
                replaceItem(data);
            })
            .on('change cut keydown drop paste', '.pl-chat .pl-reply textarea', function () {
                var $textarea = $(this);
                window.setTimeout(function () {
                    $.pocketlists.resizeTextarea($textarea)
                }, 0);
            })
            /* calendar day highlight */
            .on('mouseenter mouseleave', '.pl-item-wrapper[data-pl-due-date]', function () {
                var $calendar = $('.pl-calendar');
                if ($calendar.length) {
                    var $day = $calendar.find('[data-pl-todo-date="' + $(this).data('pl-due-date') + '"]');
                    if ($day.length) {
                        $day.toggleClass('highlighted-background');
                    }
                }
            })
            .on('moveToList.pl2', item_selector, function (e, data) {
                moveToList.call(this, data.id, data.drop);
            })
            .on('assignTo.pl2', item_selector, function (e, data) {
                assignTo.call(this, data.id, data.drop);
            })
            .on('dblclick', '.pl-select-label', function (e) {
                e.preventDefault();

                openItemDetailsWrapper.call(this);
            })
            .on('click', '.pl-edit', function (e) {
                e.preventDefault();

                openItemDetailsWrapper.call(this);
            })
            .on('click', '.pl-comment', function (e) {
                e.preventDefault();
                var $item = $(this).closest('.pl-item-wrapper[data-id]');

                ItemComments.trigger('show.pl2', [parseInt($item.data('id'))])
            })
        ;

        // keyboard
        $(document).on('keydown', function (e) {
            switch (e.which) {
                //case 39: // -->
                //    increase_item.call(this);
                //    break;
                case 9: // tab
                    if (!(o.list && o.list.list_details.isVisible()) && !ItemDetails.isVisible()) {
                        if (e.shiftKey) {
                            decreaseItem(e);
                        } else {
                            increaseItem(e);
                        }
                    }
                    break;
                //case 37: // <--
                //    decrease_item.call(this);
                //    break;
                case 27: // esc
                    //($current_item.length && $current_item.find('.pl-chat').is(':visible')) && hideChatCommentInput();
                    ItemComments.isVisible() && ItemComments.trigger('hide.pl2');
                    ItemDetails.isVisible() && ItemDetails.trigger('hide.pl2');
                    break;
            }
        });

        // show logbook items
        $show_logbook_items.click(function () {
            $done_items.slideDown(200);
            $(this).slideUp(200);
            return false;
        });
    };

    init();

    return {
        $el: $list_items_wrapper,
        trigger: function (event, data) {
            this.$el && this.$el.trigger(event, data);
        }
    };
};
