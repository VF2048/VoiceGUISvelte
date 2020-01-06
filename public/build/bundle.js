
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.head.appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function to_number(value) {
        return value === '' ? undefined : +value;
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        if (value != null || input.value) {
            input.value = value;
        }
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function flush() {
        const seen_callbacks = new Set();
        do {
            // first, call beforeUpdate functions
            // and update components
            while (dirty_components.length) {
                const component = dirty_components.shift();
                set_current_component(component);
                update(component.$$);
            }
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    callback();
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, value = ret) => {
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(children(options.target));
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, detail));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
    }

    /* src\App.svelte generated by Svelte v3.16.7 */

    const file = "src\\App.svelte";

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[39] = list[i].name;
    	child_ctx[36] = list[i].room;
    	child_ctx[40] = list[i].value;
    	child_ctx[41] = list;
    	child_ctx[42] = i;
    	return child_ctx;
    }

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[36] = list[i];
    	child_ctx[38] = i;
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[43] = list[i];
    	child_ctx[38] = i;
    	return child_ctx;
    }

    function get_each_context_3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[36] = list[i];
    	child_ctx[38] = i;
    	return child_ctx;
    }

    function get_each_context_4(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[39] = list[i];
    	child_ctx[38] = i;
    	return child_ctx;
    }

    function get_each_context_5(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[47] = list[i];
    	child_ctx[38] = i;
    	return child_ctx;
    }

    // (798:1) {#if gui.deviceSelectOpen}
    function create_if_block_7(ctx) {
    	let div3;
    	let div2;
    	let p;
    	let t1;
    	let div0;
    	let ul;
    	let t2;
    	let div1;
    	let button;
    	let dispose;
    	let each_value_5 = /*config*/ ctx[0].device;
    	let each_blocks = [];

    	for (let i = 0; i < each_value_5.length; i += 1) {
    		each_blocks[i] = create_each_block_5(get_each_context_5(ctx, each_value_5, i));
    	}

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			div2 = element("div");
    			p = element("p");
    			p.textContent = "Выберите устройство";
    			t1 = space();
    			div0 = element("div");
    			ul = element("ul");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t2 = space();
    			div1 = element("div");
    			button = element("button");
    			button.textContent = "Закрыть";
    			attr_dev(p, "class", "leaf svelte-k3eom2");
    			add_location(p, file, 800, 4, 15576);
    			attr_dev(ul, "class", "ul svelte-k3eom2");
    			attr_dev(ul, "id", "deviceSelectList");
    			add_location(ul, file, 802, 5, 15696);
    			attr_dev(div0, "id", "mutListPlayers");
    			attr_dev(div0, "class", "deviceListPlayers deviceSelectButton svelte-k3eom2");
    			add_location(div0, file, 801, 4, 15620);
    			attr_dev(button, "id", "deviceSelectCloseButton");
    			attr_dev(button, "class", "button svelte-k3eom2");
    			add_location(button, file, 812, 5, 16122);
    			attr_dev(div1, "class", "deviceSelectCloseButton svelte-k3eom2");
    			add_location(div1, file, 811, 4, 16079);
    			attr_dev(div2, "class", "mutlist svelte-k3eom2");
    			add_location(div2, file, 799, 3, 15550);
    			attr_dev(div3, "id", "floatwindow");
    			attr_dev(div3, "class", "svelte-k3eom2");
    			add_location(div3, file, 798, 2, 15523);
    			dispose = listen_dev(button, "click", /*click_handler*/ ctx[16], false, false, false);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div2);
    			append_dev(div2, p);
    			append_dev(div2, t1);
    			append_dev(div2, div0);
    			append_dev(div0, ul);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul, null);
    			}

    			append_dev(div2, t2);
    			append_dev(div2, div1);
    			append_dev(div1, button);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*config*/ 1) {
    				each_value_5 = /*config*/ ctx[0].device;
    				let i;

    				for (i = 0; i < each_value_5.length; i += 1) {
    					const child_ctx = get_each_context_5(ctx, each_value_5, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_5(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(ul, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_5.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    			destroy_each(each_blocks, detaching);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_7.name,
    		type: "if",
    		source: "(798:1) {#if gui.deviceSelectOpen}",
    		ctx
    	});

    	return block;
    }

    // (804:6) {#each config.device as device,id}
    function create_each_block_5(ctx) {
    	let li;
    	let input;
    	let input_value_value;
    	let input_id_value;
    	let t0;
    	let label;
    	let div;
    	let t1_value = /*device*/ ctx[47] + "";
    	let t1;
    	let label_for_value;
    	let t2;
    	let dispose;

    	const block = {
    		c: function create() {
    			li = element("li");
    			input = element("input");
    			t0 = space();
    			label = element("label");
    			div = element("div");
    			t1 = text(t1_value);
    			t2 = space();
    			attr_dev(input, "type", "radio");
    			input.__value = input_value_value = /*id*/ ctx[38];
    			input.value = input.__value;
    			attr_dev(input, "id", input_id_value = "radioDevice" + /*id*/ ctx[38]);
    			attr_dev(input, "name", "radioDevice");
    			attr_dev(input, "class", "inputDevice svelte-k3eom2");
    			/*$$binding_groups*/ ctx[15][3].push(input);
    			add_location(input, file, 805, 8, 15806);
    			attr_dev(div, "class", "button selectorDevice svelte-k3eom2");
    			add_location(div, file, 806, 37, 15968);
    			attr_dev(label, "for", label_for_value = "radioDevice" + /*id*/ ctx[38]);
    			attr_dev(label, "class", "svelte-k3eom2");
    			add_location(label, file, 806, 8, 15939);
    			attr_dev(li, "class", "li svelte-k3eom2");
    			add_location(li, file, 804, 7, 15782);
    			dispose = listen_dev(input, "change", /*input_change_handler*/ ctx[14]);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, input);
    			input.checked = input.__value === /*config*/ ctx[0].selectDevice;
    			append_dev(li, t0);
    			append_dev(li, label);
    			append_dev(label, div);
    			append_dev(div, t1);
    			append_dev(li, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*config*/ 1) {
    				input.checked = input.__value === /*config*/ ctx[0].selectDevice;
    			}

    			if (dirty[0] & /*config*/ 1 && t1_value !== (t1_value = /*device*/ ctx[47] + "")) set_data_dev(t1, t1_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    			/*$$binding_groups*/ ctx[15][3].splice(/*$$binding_groups*/ ctx[15][3].indexOf(input), 1);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_5.name,
    		type: "each",
    		source: "(804:6) {#each config.device as device,id}",
    		ctx
    	});

    	return block;
    }

    // (818:1) {#if gui.mutList}
    function create_if_block_6(ctx) {
    	let div3;
    	let div2;
    	let p;
    	let t1;
    	let input;
    	let t2;
    	let div0;
    	let t3;
    	let div1;
    	let button;
    	let dispose;
    	let each_value_4 = /*mutList*/ ctx[4];
    	let each_blocks = [];

    	for (let i = 0; i < each_value_4.length; i += 1) {
    		each_blocks[i] = create_each_block_4(get_each_context_4(ctx, each_value_4, i));
    	}

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			div2 = element("div");
    			p = element("p");
    			p.textContent = "Мут лист игроков:";
    			t1 = space();
    			input = element("input");
    			t2 = space();
    			div0 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t3 = space();
    			div1 = element("div");
    			button = element("button");
    			button.textContent = "Закрыть";
    			attr_dev(p, "class", "leaf svelte-k3eom2");
    			add_location(p, file, 820, 4, 16347);
    			attr_dev(input, "class", "input-text leaf mut-leaf svelte-k3eom2");
    			attr_dev(input, "type", "text");
    			attr_dev(input, "placeholder", "Введите никнейм");
    			add_location(input, file, 821, 4, 16389);
    			attr_dev(div0, "id", "mutListPlayers");
    			attr_dev(div0, "class", "mutListPlayers svelte-k3eom2");
    			add_location(div0, file, 822, 4, 16476);
    			attr_dev(button, "id", "mutListCloseButton");
    			attr_dev(button, "class", "button svelte-k3eom2");
    			add_location(button, file, 828, 5, 16701);
    			set_style(div1, "text-align", "center");
    			attr_dev(div1, "class", "svelte-k3eom2");
    			add_location(div1, file, 827, 4, 16662);
    			attr_dev(div2, "class", "mutlist svelte-k3eom2");
    			add_location(div2, file, 819, 3, 16321);
    			attr_dev(div3, "id", "floatwindow");
    			attr_dev(div3, "class", "svelte-k3eom2");
    			add_location(div3, file, 818, 2, 16295);
    			dispose = listen_dev(button, "click", /*click_handler_1*/ ctx[17], false, false, false);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div2);
    			append_dev(div2, p);
    			append_dev(div2, t1);
    			append_dev(div2, input);
    			append_dev(div2, t2);
    			append_dev(div2, div0);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div0, null);
    			}

    			append_dev(div2, t3);
    			append_dev(div2, div1);
    			append_dev(div1, button);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*mutList*/ 16) {
    				each_value_4 = /*mutList*/ ctx[4];
    				let i;

    				for (i = 0; i < each_value_4.length; i += 1) {
    					const child_ctx = get_each_context_4(ctx, each_value_4, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_4(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div0, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_4.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    			destroy_each(each_blocks, detaching);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_6.name,
    		type: "if",
    		source: "(818:1) {#if gui.mutList}",
    		ctx
    	});

    	return block;
    }

    // (824:5) {#each mutList as name,id}
    function create_each_block_4(ctx) {
    	let button;
    	let t_value = /*name*/ ctx[39] + "";
    	let t;
    	let button_id_value;

    	const block = {
    		c: function create() {
    			button = element("button");
    			t = text(t_value);
    			attr_dev(button, "id", button_id_value = "1" + /*id*/ ctx[38] + "Vf");
    			attr_dev(button, "class", "button selector mut-leaf svelte-k3eom2");
    			add_location(button, file, 824, 7, 16564);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, t);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_4.name,
    		type: "each",
    		source: "(824:5) {#each mutList as name,id}",
    		ctx
    	});

    	return block;
    }

    // (834:1) {#if gui.roomSelectOpen}
    function create_if_block_5(ctx) {
    	let div4;
    	let div3;
    	let div2;
    	let p;
    	let t1;
    	let div0;
    	let ul;
    	let t2;
    	let div1;
    	let button;
    	let dispose;
    	let each_value_3 = /*config*/ ctx[0].room;
    	let each_blocks = [];

    	for (let i = 0; i < each_value_3.length; i += 1) {
    		each_blocks[i] = create_each_block_3(get_each_context_3(ctx, each_value_3, i));
    	}

    	const block = {
    		c: function create() {
    			div4 = element("div");
    			div3 = element("div");
    			div2 = element("div");
    			p = element("p");
    			p.textContent = "Выберите комнату";
    			t1 = space();
    			div0 = element("div");
    			ul = element("ul");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t2 = space();
    			div1 = element("div");
    			button = element("button");
    			button.textContent = "Закрыть";
    			attr_dev(p, "class", "leaf svelte-k3eom2");
    			add_location(p, file, 837, 24, 16978);
    			attr_dev(ul, "class", "ul svelte-k3eom2");
    			attr_dev(ul, "id", "roomSelectList");
    			add_location(ul, file, 839, 28, 17138);
    			attr_dev(div0, "id", "mutListPlayers");
    			attr_dev(div0, "class", "deviceListPlayers deviceSelectButton svelte-k3eom2");
    			add_location(div0, file, 838, 24, 17039);
    			attr_dev(button, "id", "roomSelectCloseButton");
    			attr_dev(button, "class", "button svelte-k3eom2");
    			add_location(button, file, 849, 28, 17646);
    			attr_dev(div1, "class", "deviceSelectCloseButton svelte-k3eom2");
    			add_location(div1, file, 848, 24, 17580);
    			attr_dev(div2, "class", "mutlist svelte-k3eom2");
    			add_location(div2, file, 836, 16, 16932);
    			attr_dev(div3, "id", "roomSelect");
    			attr_dev(div3, "class", "svelte-k3eom2");
    			add_location(div3, file, 835, 3, 16894);
    			attr_dev(div4, "id", "floatwindow");
    			attr_dev(div4, "class", "svelte-k3eom2");
    			add_location(div4, file, 834, 2, 16867);
    			dispose = listen_dev(button, "click", /*click_handler_2*/ ctx[19], false, false, false);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div4, anchor);
    			append_dev(div4, div3);
    			append_dev(div3, div2);
    			append_dev(div2, p);
    			append_dev(div2, t1);
    			append_dev(div2, div0);
    			append_dev(div0, ul);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul, null);
    			}

    			append_dev(div2, t2);
    			append_dev(div2, div1);
    			append_dev(div1, button);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*config*/ 1) {
    				each_value_3 = /*config*/ ctx[0].room;
    				let i;

    				for (i = 0; i < each_value_3.length; i += 1) {
    					const child_ctx = get_each_context_3(ctx, each_value_3, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_3(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(ul, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_3.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div4);
    			destroy_each(each_blocks, detaching);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_5.name,
    		type: "if",
    		source: "(834:1) {#if gui.roomSelectOpen}",
    		ctx
    	});

    	return block;
    }

    // (841:8) {#each config.room as room,id}
    function create_each_block_3(ctx) {
    	let li;
    	let input;
    	let input_value_value;
    	let input_id_value;
    	let t0;
    	let label;
    	let div;
    	let t1_value = /*room*/ ctx[36] + "";
    	let t1;
    	let label_for_value;
    	let t2;
    	let dispose;

    	const block = {
    		c: function create() {
    			li = element("li");
    			input = element("input");
    			t0 = space();
    			label = element("label");
    			div = element("div");
    			t1 = text(t1_value);
    			t2 = space();
    			attr_dev(input, "type", "radio");
    			input.__value = input_value_value = /*id*/ ctx[38];
    			input.value = input.__value;
    			attr_dev(input, "id", input_id_value = "radioRoom" + /*id*/ ctx[38]);
    			attr_dev(input, "name", "radioRoom");
    			attr_dev(input, "class", "inputDevice svelte-k3eom2");
    			/*$$binding_groups*/ ctx[15][2].push(input);
    			add_location(input, file, 842, 10, 17248);
    			attr_dev(div, "class", "button selectorDevice svelte-k3eom2");
    			add_location(div, file, 843, 37, 17404);
    			attr_dev(label, "for", label_for_value = "radioRoom" + /*id*/ ctx[38]);
    			attr_dev(label, "class", "svelte-k3eom2");
    			add_location(label, file, 843, 10, 17377);
    			attr_dev(li, "class", "li svelte-k3eom2");
    			add_location(li, file, 841, 9, 17222);
    			dispose = listen_dev(input, "change", /*input_change_handler_1*/ ctx[18]);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, input);
    			input.checked = input.__value === /*config*/ ctx[0].selectRoom;
    			append_dev(li, t0);
    			append_dev(li, label);
    			append_dev(label, div);
    			append_dev(div, t1);
    			append_dev(li, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*config*/ 1) {
    				input.checked = input.__value === /*config*/ ctx[0].selectRoom;
    			}

    			if (dirty[0] & /*config*/ 1 && t1_value !== (t1_value = /*room*/ ctx[36] + "")) set_data_dev(t1, t1_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    			/*$$binding_groups*/ ctx[15][2].splice(/*$$binding_groups*/ ctx[15][2].indexOf(input), 1);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_3.name,
    		type: "each",
    		source: "(841:8) {#each config.room as room,id}",
    		ctx
    	});

    	return block;
    }

    // (856:1) {#if gui.channelSelectOpen}
    function create_if_block_4(ctx) {
    	let div8;
    	let div7;
    	let div6;
    	let p;
    	let t1;
    	let div4;
    	let ul;
    	let t2;
    	let li0;
    	let input0;
    	let t3;
    	let label0;
    	let div0;
    	let t5;
    	let li1;
    	let input1;
    	let label1;
    	let div1;
    	let li2;
    	let input2;
    	let label2;
    	let div2;
    	let li3;
    	let input3;
    	let label3;
    	let div3;
    	let t9;
    	let div5;
    	let button;
    	let dispose;
    	let each_value_2 = /*config*/ ctx[0].channel;
    	let each_blocks = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
    	}

    	const block = {
    		c: function create() {
    			div8 = element("div");
    			div7 = element("div");
    			div6 = element("div");
    			p = element("p");
    			p.textContent = "Выберите канал";
    			t1 = space();
    			div4 = element("div");
    			ul = element("ul");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t2 = space();
    			li0 = element("li");
    			input0 = element("input");
    			t3 = space();
    			label0 = element("label");
    			div0 = element("div");
    			div0.textContent = "Channel1";
    			t5 = space();
    			li1 = element("li");
    			input1 = element("input");
    			label1 = element("label");
    			div1 = element("div");
    			div1.textContent = "Channel2";
    			li2 = element("li");
    			input2 = element("input");
    			label2 = element("label");
    			div2 = element("div");
    			div2.textContent = "Channel3";
    			li3 = element("li");
    			input3 = element("input");
    			label3 = element("label");
    			div3 = element("div");
    			div3.textContent = "Channel4";
    			t9 = space();
    			div5 = element("div");
    			button = element("button");
    			button.textContent = "Закрыть";
    			attr_dev(p, "class", "leaf svelte-k3eom2");
    			add_location(p, file, 859, 24, 17991);
    			attr_dev(input0, "type", "radio");
    			input0.value = "0";
    			attr_dev(input0, "id", "radioChannel0");
    			attr_dev(input0, "name", "radioChannel");
    			attr_dev(input0, "class", "inputDevice svelte-k3eom2");
    			add_location(input0, file, 869, 8, 18570);
    			attr_dev(div0, "class", "button selectorDevice svelte-k3eom2");
    			add_location(div0, file, 870, 35, 18695);
    			attr_dev(label0, "for", "radioChannel0");
    			attr_dev(label0, "class", "svelte-k3eom2");
    			add_location(label0, file, 870, 8, 18668);
    			attr_dev(li0, "class", "li svelte-k3eom2");
    			add_location(li0, file, 868, 28, 18546);
    			attr_dev(input1, "type", "radio");
    			input1.value = "1";
    			attr_dev(input1, "id", "radioChannel1");
    			attr_dev(input1, "name", "radioChannel");
    			attr_dev(input1, "class", "inputDevice svelte-k3eom2");
    			add_location(input1, file, 872, 22, 18788);
    			attr_dev(div1, "class", "button selectorDevice svelte-k3eom2");
    			add_location(div1, file, 872, 138, 18904);
    			attr_dev(label1, "for", "radioChannel1");
    			attr_dev(label1, "class", "svelte-k3eom2");
    			add_location(label1, file, 872, 111, 18877);
    			attr_dev(li1, "class", "li svelte-k3eom2");
    			add_location(li1, file, 872, 7, 18773);
    			attr_dev(input2, "type", "radio");
    			input2.value = "2";
    			attr_dev(input2, "id", "radioChannel2");
    			attr_dev(input2, "name", "radioChannel");
    			attr_dev(input2, "class", "inputDevice svelte-k3eom2");
    			add_location(input2, file, 872, 215, 18981);
    			attr_dev(div2, "class", "button selectorDevice svelte-k3eom2");
    			add_location(div2, file, 872, 331, 19097);
    			attr_dev(label2, "for", "radioChannel2");
    			attr_dev(label2, "class", "svelte-k3eom2");
    			add_location(label2, file, 872, 304, 19070);
    			attr_dev(li2, "class", "li svelte-k3eom2");
    			add_location(li2, file, 872, 200, 18966);
    			attr_dev(input3, "type", "radio");
    			input3.value = "3";
    			attr_dev(input3, "id", "radioChannel3");
    			attr_dev(input3, "name", "radioChannel");
    			attr_dev(input3, "class", "inputDevice svelte-k3eom2");
    			add_location(input3, file, 872, 408, 19174);
    			attr_dev(div3, "class", "button selectorDevice svelte-k3eom2");
    			add_location(div3, file, 872, 524, 19290);
    			attr_dev(label3, "for", "radioChannel3");
    			attr_dev(label3, "class", "svelte-k3eom2");
    			add_location(label3, file, 872, 497, 19263);
    			attr_dev(li3, "class", "li svelte-k3eom2");
    			add_location(li3, file, 872, 393, 19159);
    			attr_dev(ul, "class", "ul svelte-k3eom2");
    			attr_dev(ul, "id", "channelSelectList");
    			add_location(ul, file, 861, 28, 18149);
    			attr_dev(div4, "id", "mutListPlayers");
    			attr_dev(div4, "class", "deviceListPlayers deviceSelectButton svelte-k3eom2");
    			add_location(div4, file, 860, 24, 18050);
    			attr_dev(button, "id", "channelSelectCloseButton");
    			attr_dev(button, "class", "button svelte-k3eom2");
    			add_location(button, file, 876, 28, 19487);
    			attr_dev(div5, "class", "deviceSelectCloseButton svelte-k3eom2");
    			add_location(div5, file, 875, 24, 19421);
    			attr_dev(div6, "class", "mutlist svelte-k3eom2");
    			add_location(div6, file, 858, 16, 17945);
    			attr_dev(div7, "id", "channelSelect");
    			attr_dev(div7, "class", "svelte-k3eom2");
    			add_location(div7, file, 857, 3, 17904);
    			attr_dev(div8, "id", "floatwindow");
    			attr_dev(div8, "class", "svelte-k3eom2");
    			add_location(div8, file, 856, 2, 17877);
    			dispose = listen_dev(button, "click", /*click_handler_3*/ ctx[21], false, false, false);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div8, anchor);
    			append_dev(div8, div7);
    			append_dev(div7, div6);
    			append_dev(div6, p);
    			append_dev(div6, t1);
    			append_dev(div6, div4);
    			append_dev(div4, ul);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul, null);
    			}

    			append_dev(ul, t2);
    			append_dev(ul, li0);
    			append_dev(li0, input0);
    			append_dev(li0, t3);
    			append_dev(li0, label0);
    			append_dev(label0, div0);
    			append_dev(ul, t5);
    			append_dev(ul, li1);
    			append_dev(li1, input1);
    			append_dev(li1, label1);
    			append_dev(label1, div1);
    			append_dev(ul, li2);
    			append_dev(li2, input2);
    			append_dev(li2, label2);
    			append_dev(label2, div2);
    			append_dev(ul, li3);
    			append_dev(li3, input3);
    			append_dev(li3, label3);
    			append_dev(label3, div3);
    			append_dev(div6, t9);
    			append_dev(div6, div5);
    			append_dev(div5, button);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*config*/ 1) {
    				each_value_2 = /*config*/ ctx[0].channel;
    				let i;

    				for (i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2(ctx, each_value_2, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_2(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(ul, t2);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_2.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div8);
    			destroy_each(each_blocks, detaching);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(856:1) {#if gui.channelSelectOpen}",
    		ctx
    	});

    	return block;
    }

    // (863:7) {#each config.channel as channel,id}
    function create_each_block_2(ctx) {
    	let li;
    	let input;
    	let input_value_value;
    	let input_id_value;
    	let t0;
    	let label;
    	let div;
    	let t1_value = /*channel*/ ctx[43] + "";
    	let t1;
    	let label_for_value;
    	let dispose;

    	const block = {
    		c: function create() {
    			li = element("li");
    			input = element("input");
    			t0 = space();
    			label = element("label");
    			div = element("div");
    			t1 = text(t1_value);
    			attr_dev(input, "type", "radio");
    			input.__value = input_value_value = /*id*/ ctx[38];
    			input.value = input.__value;
    			attr_dev(input, "id", input_id_value = "radioChanne" + /*id*/ ctx[38]);
    			attr_dev(input, "name", "radioChannel");
    			attr_dev(input, "class", "inputDevice svelte-k3eom2");
    			/*$$binding_groups*/ ctx[15][1].push(input);
    			add_location(input, file, 864, 9, 18265);
    			attr_dev(div, "class", "button selectorDevice svelte-k3eom2");
    			add_location(div, file, 865, 38, 18430);
    			attr_dev(label, "for", label_for_value = "radioChanne" + /*id*/ ctx[38]);
    			attr_dev(label, "class", "svelte-k3eom2");
    			add_location(label, file, 865, 9, 18401);
    			attr_dev(li, "class", "li svelte-k3eom2");
    			add_location(li, file, 863, 8, 18240);
    			dispose = listen_dev(input, "change", /*input_change_handler_2*/ ctx[20]);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, input);
    			input.checked = input.__value === /*config*/ ctx[0].selectchannel;
    			append_dev(li, t0);
    			append_dev(li, label);
    			append_dev(label, div);
    			append_dev(div, t1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*config*/ 1) {
    				input.checked = input.__value === /*config*/ ctx[0].selectchannel;
    			}

    			if (dirty[0] & /*config*/ 1 && t1_value !== (t1_value = /*channel*/ ctx[43] + "")) set_data_dev(t1, t1_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    			/*$$binding_groups*/ ctx[15][1].splice(/*$$binding_groups*/ ctx[15][1].indexOf(input), 1);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_2.name,
    		type: "each",
    		source: "(863:7) {#each config.channel as channel,id}",
    		ctx
    	});

    	return block;
    }

    // (883:1) {#if gui.volumeMainWindow}
    function create_if_block_2(ctx) {
    	let div;
    	let each_value = /*volumeWindowRoom*/ ctx[5];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div, "class", "volumeMainWindow svelte-k3eom2");
    			attr_dev(div, "id", "volumeMainWindow");
    			add_location(div, file, 883, 2, 19723);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*volumeWindowPlayer, volumeWindowRoom*/ 34) {
    				each_value = /*volumeWindowRoom*/ ctx[5];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(883:1) {#if gui.volumeMainWindow}",
    		ctx
    	});

    	return block;
    }

    // (897:8) {#if room == id}
    function create_if_block_3(ctx) {
    	let tr;
    	let th0;
    	let img0;
    	let img0_src_value;
    	let t0;
    	let p0;
    	let t1_value = /*name*/ ctx[39] + "";
    	let t1;
    	let t2;
    	let th1;
    	let img1;
    	let img1_src_value;
    	let t3;
    	let p1;
    	let p1_id_value;
    	let t5;
    	let p2;
    	let t7;
    	let th2;
    	let img2;
    	let img2_src_value;
    	let t8;
    	let input;
    	let input_id_value;
    	let t9;
    	let p3;
    	let t10_value = /*value*/ ctx[40] + "";
    	let t10;
    	let p3_id_value;
    	let t11;
    	let dispose;

    	function input_change_input_handler() {
    		/*input_change_input_handler*/ ctx[22].call(input, /*value*/ ctx[40], /*each_value_1*/ ctx[41], /*each_index*/ ctx[42]);
    	}

    	const block = {
    		c: function create() {
    			tr = element("tr");
    			th0 = element("th");
    			img0 = element("img");
    			t0 = space();
    			p0 = element("p");
    			t1 = text(t1_value);
    			t2 = space();
    			th1 = element("th");
    			img1 = element("img");
    			t3 = space();
    			p1 = element("p");
    			p1.textContent = "1000";
    			t5 = space();
    			p2 = element("p");
    			p2.textContent = "m.";
    			t7 = space();
    			th2 = element("th");
    			img2 = element("img");
    			t8 = space();
    			input = element("input");
    			t9 = space();
    			p3 = element("p");
    			t10 = text(t10_value);
    			t11 = space();
    			if (img0.src !== (img0_src_value = "img/userloc.png")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "class", "userloc svelte-k3eom2");
    			attr_dev(img0, "alt", "userloc");
    			add_location(img0, file, 899, 11, 20426);
    			attr_dev(p0, "class", "userName svelte-k3eom2");
    			add_location(p0, file, 900, 11, 20495);
    			attr_dev(th0, "class", "th svelte-k3eom2");
    			add_location(th0, file, 898, 10, 20399);
    			if (img1.src !== (img1_src_value = "img/distance.png")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "class", "imgdistance svelte-k3eom2");
    			attr_dev(img1, "alt", "distance");
    			add_location(img1, file, 903, 11, 20579);
    			attr_dev(p1, "id", p1_id_value = "userName" + /*id*/ ctx[38] + "Distance");
    			attr_dev(p1, "class", "userName svelte-k3eom2");
    			add_location(p1, file, 904, 11, 20654);
    			attr_dev(p2, "class", "userName margin svelte-k3eom2");
    			add_location(p2, file, 905, 11, 20720);
    			attr_dev(th1, "class", "th svelte-k3eom2");
    			add_location(th1, file, 902, 10, 20552);
    			if (img2.src !== (img2_src_value = "img/micSettings.png")) attr_dev(img2, "src", img2_src_value);
    			attr_dev(img2, "class", "micSettings svelte-k3eom2");
    			attr_dev(img2, "alt", "micSettings");
    			add_location(img2, file, 908, 11, 20817);
    			attr_dev(input, "id", input_id_value = "sliderP" + /*id*/ ctx[38]);
    			attr_dev(input, "min", "0");
    			attr_dev(input, "max", "100");
    			attr_dev(input, "type", "range");
    			attr_dev(input, "class", "sliderP svelte-k3eom2");
    			set_style(input, "--columnsP", /*value*/ ctx[40] + "%");
    			add_location(input, file, 909, 11, 20898);
    			attr_dev(p3, "id", p3_id_value = "sliderP" + /*id*/ ctx[38] + "volume");
    			attr_dev(p3, "class", "userName svelte-k3eom2");
    			add_location(p3, file, 910, 11, 21033);
    			attr_dev(th2, "id", "grid");
    			attr_dev(th2, "class", "th svelte-k3eom2");
    			add_location(th2, file, 907, 10, 20780);
    			attr_dev(tr, "class", "voiceRoomPlayerSettings svelte-k3eom2");
    			add_location(tr, file, 897, 10, 20352);

    			dispose = [
    				listen_dev(input, "change", input_change_input_handler),
    				listen_dev(input, "input", input_change_input_handler)
    			];
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, tr, anchor);
    			append_dev(tr, th0);
    			append_dev(th0, img0);
    			append_dev(th0, t0);
    			append_dev(th0, p0);
    			append_dev(p0, t1);
    			append_dev(tr, t2);
    			append_dev(tr, th1);
    			append_dev(th1, img1);
    			append_dev(th1, t3);
    			append_dev(th1, p1);
    			append_dev(th1, t5);
    			append_dev(th1, p2);
    			append_dev(tr, t7);
    			append_dev(tr, th2);
    			append_dev(th2, img2);
    			append_dev(th2, t8);
    			append_dev(th2, input);
    			set_input_value(input, /*value*/ ctx[40]);
    			append_dev(th2, t9);
    			append_dev(th2, p3);
    			append_dev(p3, t10);
    			append_dev(tr, t11);
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty[0] & /*volumeWindowPlayer*/ 2 && t1_value !== (t1_value = /*name*/ ctx[39] + "")) set_data_dev(t1, t1_value);

    			if (dirty[0] & /*volumeWindowPlayer*/ 2) {
    				set_style(input, "--columnsP", /*value*/ ctx[40] + "%");
    			}

    			if (dirty[0] & /*volumeWindowPlayer*/ 2) {
    				set_input_value(input, /*value*/ ctx[40]);
    			}

    			if (dirty[0] & /*volumeWindowPlayer*/ 2 && t10_value !== (t10_value = /*value*/ ctx[40] + "")) set_data_dev(t10, t10_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(tr);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(897:8) {#if room == id}",
    		ctx
    	});

    	return block;
    }

    // (896:8) {#each volumeWindowPlayer as {name, room, value}}
    function create_each_block_1(ctx) {
    	let if_block_anchor;
    	let if_block = /*room*/ ctx[36] == /*id*/ ctx[38] && create_if_block_3(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (/*room*/ ctx[36] == /*id*/ ctx[38]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_3(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(896:8) {#each volumeWindowPlayer as {name, room, value}}",
    		ctx
    	});

    	return block;
    }

    // (885:3) {#each volumeWindowRoom as room,id}
    function create_each_block(ctx) {
    	let div2;
    	let div0;
    	let img;
    	let img_src_value;
    	let t0;
    	let p;
    	let t1_value = /*room*/ ctx[36] + "";
    	let t1;
    	let t2;
    	let input;
    	let t3;
    	let label;
    	let t4;
    	let div1;
    	let table;
    	let tbody;
    	let t5;
    	let div2_id_value;
    	let each_value_1 = /*volumeWindowPlayer*/ ctx[1];
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			img = element("img");
    			t0 = space();
    			p = element("p");
    			t1 = text(t1_value);
    			t2 = space();
    			input = element("input");
    			t3 = space();
    			label = element("label");
    			t4 = space();
    			div1 = element("div");
    			table = element("table");
    			tbody = element("tbody");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t5 = space();
    			attr_dev(img, "class", "radiomin svelte-k3eom2");
    			if (img.src !== (img_src_value = "img/radiomin.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "PicturaCka");
    			add_location(img, file, 887, 6, 19901);
    			attr_dev(p, "class", "voiceroomlogotext svelte-k3eom2");
    			add_location(p, file, 888, 6, 19970);
    			attr_dev(input, "id", "hiddenSetting");
    			attr_dev(input, "type", "checkbox");
    			attr_dev(input, "class", "svelte-k3eom2");
    			add_location(input, file, 889, 6, 20016);
    			attr_dev(label, "for", "hiddenSetting");
    			attr_dev(label, "class", "hiddenSetting svelte-k3eom2");
    			add_location(label, file, 890, 6, 20065);
    			attr_dev(div0, "class", "voiceroomlogo svelte-k3eom2");
    			add_location(div0, file, 886, 5, 19867);
    			attr_dev(tbody, "class", "svelte-k3eom2");
    			add_location(tbody, file, 894, 7, 20251);
    			attr_dev(table, "id", "voiceRoomPlayerSettings1");
    			attr_dev(table, "class", "svelte-k3eom2");
    			add_location(table, file, 893, 6, 20206);
    			attr_dev(div1, "id", "voiceRoom1PlayerList");
    			attr_dev(div1, "class", "voiceRoomPlayerList svelte-k3eom2");
    			add_location(div1, file, 892, 5, 20140);
    			attr_dev(div2, "id", div2_id_value = "voiceroom" + /*id*/ ctx[38]);
    			attr_dev(div2, "class", "voiceroom svelte-k3eom2");
    			add_location(div2, file, 885, 4, 19819);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			append_dev(div0, img);
    			append_dev(div0, t0);
    			append_dev(div0, p);
    			append_dev(p, t1);
    			append_dev(div0, t2);
    			append_dev(div0, input);
    			append_dev(div0, t3);
    			append_dev(div0, label);
    			append_dev(div2, t4);
    			append_dev(div2, div1);
    			append_dev(div1, table);
    			append_dev(table, tbody);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(tbody, null);
    			}

    			append_dev(div2, t5);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*volumeWindowPlayer*/ 2) {
    				each_value_1 = /*volumeWindowPlayer*/ ctx[1];
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(tbody, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_1.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(885:3) {#each volumeWindowRoom as room,id}",
    		ctx
    	});

    	return block;
    }

    // (923:1) {#if gui.mainWindowOpen}
    function create_if_block(ctx) {
    	let div18;
    	let h1;
    	let img0;
    	let img0_src_value;
    	let t0;
    	let div6;
    	let div2;
    	let img1;
    	let img1_src_value;
    	let t1;
    	let div1;
    	let p0;
    	let t3;
    	let div0;
    	let input0;
    	let t4;
    	let p1;
    	let t5_value = /*config*/ ctx[0].main.soundVolume + "";
    	let t5;
    	let t6;
    	let div5;
    	let img2;
    	let img2_src_value;
    	let t7;
    	let div4;
    	let p2;
    	let t9;
    	let div3;
    	let input1;
    	let t10;
    	let p3;
    	let t11_value = /*config*/ ctx[0].main.microphoneVolume + "";
    	let t11;
    	let t12;
    	let div8;
    	let p4;
    	let t14;
    	let div7;
    	let button0;
    	let t16;
    	let button1;
    	let t18;
    	let button2;
    	let t20;
    	let div11;
    	let div9;
    	let p5;
    	let t22;
    	let input2;
    	let t23;
    	let label0;
    	let t24;
    	let div10;
    	let p6;
    	let t26;
    	let input3;
    	let t27;
    	let label1;
    	let t28;
    	let div16;
    	let div13;
    	let div12;
    	let p7;
    	let t30;
    	let input4;
    	let t31;
    	let label2;
    	let t32;
    	let t33;
    	let div15;
    	let button3;
    	let t35;
    	let button4;
    	let t37;
    	let div14;
    	let p8;
    	let t39;
    	let table;
    	let tbody;
    	let tr0;
    	let th0;
    	let img3;
    	let img3_src_value;
    	let t40;
    	let th1;
    	let p9;
    	let t42;
    	let th2;
    	let button5;
    	let t44;
    	let tr1;
    	let th3;
    	let img4;
    	let img4_src_value;
    	let t45;
    	let th4;
    	let p10;
    	let t47;
    	let th5;
    	let button6;
    	let t49;
    	let div17;
    	let button7;
    	let dispose;
    	let if_block = !/*config*/ ctx[0].main.inputmode && create_if_block_1(ctx);

    	const block = {
    		c: function create() {
    			div18 = element("div");
    			h1 = element("h1");
    			img0 = element("img");
    			t0 = space();
    			div6 = element("div");
    			div2 = element("div");
    			img1 = element("img");
    			t1 = space();
    			div1 = element("div");
    			p0 = element("p");
    			p0.textContent = "Громкость звука";
    			t3 = space();
    			div0 = element("div");
    			input0 = element("input");
    			t4 = space();
    			p1 = element("p");
    			t5 = text(t5_value);
    			t6 = space();
    			div5 = element("div");
    			img2 = element("img");
    			t7 = space();
    			div4 = element("div");
    			p2 = element("p");
    			p2.textContent = "Громкость микрофона";
    			t9 = space();
    			div3 = element("div");
    			input1 = element("input");
    			t10 = space();
    			p3 = element("p");
    			t11 = text(t11_value);
    			t12 = space();
    			div8 = element("div");
    			p4 = element("p");
    			p4.textContent = "Устройство ввода:";
    			t14 = space();
    			div7 = element("div");
    			button0 = element("button");
    			button0.textContent = "Микрофон";
    			t16 = space();
    			button1 = element("button");
    			button1.textContent = "Мут лист";
    			t18 = space();
    			button2 = element("button");
    			button2.textContent = "Громкость игроков";
    			t20 = space();
    			div11 = element("div");
    			div9 = element("div");
    			p5 = element("p");
    			p5.textContent = "Включение звука";
    			t22 = space();
    			input2 = element("input");
    			t23 = space();
    			label0 = element("label");
    			t24 = space();
    			div10 = element("div");
    			p6 = element("p");
    			p6.textContent = "3D Звук";
    			t26 = space();
    			input3 = element("input");
    			t27 = space();
    			label1 = element("label");
    			t28 = space();
    			div16 = element("div");
    			div13 = element("div");
    			div12 = element("div");
    			p7 = element("p");
    			p7.textContent = "Режим ввода";
    			t30 = space();
    			input4 = element("input");
    			t31 = space();
    			label2 = element("label");
    			t32 = space();
    			if (if_block) if_block.c();
    			t33 = space();
    			div15 = element("div");
    			button3 = element("button");
    			button3.textContent = "Выбор чата";
    			t35 = space();
    			button4 = element("button");
    			button4.textContent = "Выбор канала";
    			t37 = space();
    			div14 = element("div");
    			p8 = element("p");
    			p8.textContent = "Назначение клавиш:";
    			t39 = space();
    			table = element("table");
    			tbody = element("tbody");
    			tr0 = element("tr");
    			th0 = element("th");
    			img3 = element("img");
    			t40 = space();
    			th1 = element("th");
    			p9 = element("p");
    			p9.textContent = "Говорить";
    			t42 = space();
    			th2 = element("th");
    			button5 = element("button");
    			button5.textContent = "A";
    			t44 = space();
    			tr1 = element("tr");
    			th3 = element("th");
    			img4 = element("img");
    			t45 = space();
    			th4 = element("th");
    			p10 = element("p");
    			p10.textContent = "Говорить в рацию";
    			t47 = space();
    			th5 = element("th");
    			button6 = element("button");
    			button6.textContent = "B";
    			t49 = space();
    			div17 = element("div");
    			button7 = element("button");
    			button7.textContent = "Закрыть";
    			attr_dev(img0, "class", "mainImg svelte-k3eom2");
    			if (img0.src !== (img0_src_value = "img/logo.png")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "alt", "Logo");
    			add_location(img0, file, 924, 17, 21296);
    			attr_dev(h1, "id", "logo");
    			attr_dev(h1, "class", "svelte-k3eom2");
    			add_location(h1, file, 924, 3, 21282);
    			if (img1.src !== (img1_src_value = "img/headphones.png")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "alt", "Headphones");
    			attr_dev(img1, "class", "inline-block headphones shadow svelte-k3eom2");
    			add_location(img1, file, 927, 5, 21405);
    			attr_dev(p0, "class", "volume svelte-k3eom2");
    			add_location(p0, file, 929, 6, 21542);
    			attr_dev(input0, "id", "range1");
    			attr_dev(input0, "min", "0");
    			attr_dev(input0, "max", "100");
    			attr_dev(input0, "type", "range");
    			attr_dev(input0, "class", "slider svelte-k3eom2");
    			set_style(input0, "--columns", /*config*/ ctx[0].main.soundVolume + "%");
    			add_location(input0, file, 931, 7, 21614);
    			attr_dev(p1, "class", "light inline-block svelte-k3eom2");
    			add_location(p1, file, 932, 7, 21774);
    			attr_dev(div0, "class", "volume svelte-k3eom2");
    			add_location(div0, file, 930, 6, 21586);
    			attr_dev(div1, "class", "inline-block soundvolume svelte-k3eom2");
    			add_location(div1, file, 928, 5, 21497);
    			attr_dev(div2, "class", "sound svelte-k3eom2");
    			add_location(div2, file, 926, 4, 21380);
    			if (img2.src !== (img2_src_value = "img/mic.png")) attr_dev(img2, "src", img2_src_value);
    			attr_dev(img2, "alt", "Mic");
    			attr_dev(img2, "class", "mic inline-block shadow svelte-k3eom2");
    			add_location(img2, file, 937, 5, 21899);
    			attr_dev(p2, "class", "volume svelte-k3eom2");
    			add_location(p2, file, 939, 5, 22014);
    			attr_dev(input1, "id", "range2");
    			attr_dev(input1, "min", "0");
    			attr_dev(input1, "max", "100");
    			attr_dev(input1, "type", "range");
    			attr_dev(input1, "class", "slider svelte-k3eom2");
    			set_style(input1, "--columns", /*config*/ ctx[0].main.microphoneVolume + "%");
    			add_location(input1, file, 941, 7, 22090);
    			attr_dev(p3, "class", "light inline-block svelte-k3eom2");
    			add_location(p3, file, 942, 7, 22260);
    			attr_dev(div3, "class", "volume svelte-k3eom2");
    			add_location(div3, file, 940, 6, 22062);
    			attr_dev(div4, "class", "inline-block soundvolume svelte-k3eom2");
    			add_location(div4, file, 938, 5, 21970);
    			attr_dev(div5, "class", "sound svelte-k3eom2");
    			add_location(div5, file, 936, 4, 21874);
    			attr_dev(div6, "id", "boxvoice");
    			attr_dev(div6, "class", "svelte-k3eom2");
    			add_location(div6, file, 925, 3, 21356);
    			attr_dev(p4, "class", "regular svelte-k3eom2");
    			add_location(p4, file, 948, 4, 22402);
    			attr_dev(button0, "class", "input-text deviceSelectOpen svelte-k3eom2");
    			attr_dev(button0, "id", "deviceSelectOpenButton");
    			add_location(button0, file, 950, 5, 22458);
    			attr_dev(button1, "class", "button mut shadow svelte-k3eom2");
    			attr_dev(button1, "id", "mutListOpenButton");
    			add_location(button1, file, 951, 5, 22598);
    			attr_dev(button2, "class", "button mut shadow svelte-k3eom2");
    			attr_dev(button2, "id", "volumePlayersButton");
    			add_location(button2, file, 952, 5, 22714);
    			attr_dev(div7, "class", "svelte-k3eom2");
    			add_location(div7, file, 949, 4, 22447);
    			attr_dev(div8, "class", "boxdevice svelte-k3eom2");
    			add_location(div8, file, 947, 3, 22374);
    			attr_dev(p5, "class", "svelte-k3eom2");
    			add_location(p5, file, 957, 5, 22935);
    			attr_dev(input2, "id", "triggerOnOffSound");
    			attr_dev(input2, "type", "checkbox");
    			attr_dev(input2, "class", "svelte-k3eom2");
    			add_location(input2, file, 958, 5, 22963);
    			attr_dev(label0, "for", "triggerOnOffSound");
    			attr_dev(label0, "class", "checker onoff-sound svelte-k3eom2");
    			add_location(label0, file, 959, 5, 23060);
    			attr_dev(div9, "class", "alignment svelte-k3eom2");
    			add_location(div9, file, 956, 4, 22906);
    			attr_dev(p6, "class", "svelte-k3eom2");
    			add_location(p6, file, 962, 5, 23180);
    			attr_dev(input3, "id", "triggerSound3D");
    			attr_dev(input3, "type", "checkbox");
    			attr_dev(input3, "class", "svelte-k3eom2");
    			add_location(input3, file, 963, 5, 23200);
    			attr_dev(label1, "for", "triggerSound3D");
    			attr_dev(label1, "class", "checker checker-sound3D svelte-k3eom2");
    			add_location(label1, file, 964, 5, 23291);
    			attr_dev(div10, "class", "sound3D alignment svelte-k3eom2");
    			add_location(div10, file, 961, 4, 23143);
    			attr_dev(div11, "class", "boxmodes alignment svelte-k3eom2");
    			add_location(div11, file, 955, 3, 22869);
    			attr_dev(p7, "class", "white svelte-k3eom2");
    			add_location(p7, file, 970, 6, 23495);
    			attr_dev(input4, "id", "triggerInputMode");
    			attr_dev(input4, "type", "checkbox");
    			attr_dev(input4, "class", "svelte-k3eom2");
    			add_location(input4, file, 971, 6, 23534);
    			attr_dev(label2, "for", "triggerInputMode");
    			attr_dev(label2, "class", "checker input-mode svelte-k3eom2");
    			add_location(label2, file, 972, 6, 23623);
    			attr_dev(div12, "class", "margin-bottom alignment svelte-k3eom2");
    			add_location(div12, file, 969, 5, 23451);
    			attr_dev(div13, "class", "upinputmode svelte-k3eom2");
    			add_location(div13, file, 968, 4, 23420);
    			attr_dev(button3, "class", "input-text channelSelectOpen svelte-k3eom2");
    			attr_dev(button3, "id", "roomSelectOpenButton");
    			add_location(button3, file, 994, 5, 24619);
    			attr_dev(button4, "class", "input-text channelSelectOpen svelte-k3eom2");
    			attr_dev(button4, "id", "channelSelectOpenButton");
    			add_location(button4, file, 995, 5, 24758);
    			attr_dev(p8, "class", "white svelte-k3eom2");
    			add_location(p8, file, 997, 6, 24938);
    			attr_dev(div14, "class", "alignmentKey svelte-k3eom2");
    			add_location(div14, file, 996, 5, 24905);
    			if (img3.src !== (img3_src_value = "img/minmik.png")) attr_dev(img3, "src", img3_src_value);
    			attr_dev(img3, "class", "minMic svelte-k3eom2");
    			attr_dev(img3, "alt", "minMic");
    			add_location(img3, file, 1002, 12, 25071);
    			attr_dev(th0, "class", "svelte-k3eom2");
    			add_location(th0, file, 1002, 8, 25067);
    			attr_dev(p9, "class", "button-selection svelte-k3eom2");
    			add_location(p9, file, 1003, 12, 25143);
    			attr_dev(th1, "class", "svelte-k3eom2");
    			add_location(th1, file, 1003, 8, 25139);
    			attr_dev(button5, "class", "inputbutton input-text svelte-k3eom2");
    			attr_dev(button5, "id", "kiGlobal");
    			add_location(button5, file, 1004, 12, 25201);
    			attr_dev(th2, "class", "svelte-k3eom2");
    			add_location(th2, file, 1004, 8, 25197);
    			attr_dev(tr0, "class", "svelte-k3eom2");
    			add_location(tr0, file, 1001, 7, 25054);
    			if (img4.src !== (img4_src_value = "img/radio.png")) attr_dev(img4, "src", img4_src_value);
    			attr_dev(img4, "class", "minradio svelte-k3eom2");
    			attr_dev(img4, "alt", "minradio");
    			add_location(img4, file, 1007, 12, 25307);
    			attr_dev(th3, "class", "svelte-k3eom2");
    			add_location(th3, file, 1007, 8, 25303);
    			attr_dev(p10, "class", "button-selection svelte-k3eom2");
    			add_location(p10, file, 1008, 12, 25382);
    			attr_dev(th4, "class", "svelte-k3eom2");
    			add_location(th4, file, 1008, 8, 25378);
    			attr_dev(button6, "class", "inputbutton input-text svelte-k3eom2");
    			attr_dev(button6, "id", "kiRadio");
    			add_location(button6, file, 1009, 12, 25448);
    			attr_dev(th5, "class", "svelte-k3eom2");
    			add_location(th5, file, 1009, 8, 25444);
    			attr_dev(tr1, "class", "svelte-k3eom2");
    			add_location(tr1, file, 1006, 7, 25290);
    			attr_dev(tbody, "class", "svelte-k3eom2");
    			add_location(tbody, file, 1000, 6, 25039);
    			attr_dev(table, "class", "keyname-space-between svelte-k3eom2");
    			add_location(table, file, 999, 5, 24995);
    			attr_dev(div15, "class", "inline-block margin svelte-k3eom2");
    			add_location(div15, file, 993, 4, 24580);
    			attr_dev(div16, "class", "boxmodes box-flex svelte-k3eom2");
    			add_location(div16, file, 967, 3, 23384);
    			attr_dev(button7, "class", "button shadow closebuttonwidth svelte-k3eom2");
    			add_location(button7, file, 1016, 4, 25613);
    			attr_dev(div17, "class", "boxmodes end svelte-k3eom2");
    			add_location(div17, file, 1015, 3, 25582);
    			attr_dev(div18, "id", "container");
    			attr_dev(div18, "class", "svelte-k3eom2");
    			add_location(div18, file, 923, 2, 21258);

    			dispose = [
    				listen_dev(input0, "change", /*input0_change_input_handler*/ ctx[23]),
    				listen_dev(input0, "input", /*input0_change_input_handler*/ ctx[23]),
    				listen_dev(input1, "change", /*input1_change_input_handler*/ ctx[24]),
    				listen_dev(input1, "input", /*input1_change_input_handler*/ ctx[24]),
    				listen_dev(button0, "click", /*click_handler_4*/ ctx[25], false, false, false),
    				listen_dev(button1, "click", /*click_handler_5*/ ctx[26], false, false, false),
    				listen_dev(button2, "click", /*click_handler_6*/ ctx[27], false, false, false),
    				listen_dev(input2, "change", /*input2_change_handler*/ ctx[28]),
    				listen_dev(input3, "change", /*input3_change_handler*/ ctx[29]),
    				listen_dev(input4, "change", /*input4_change_handler*/ ctx[30]),
    				listen_dev(button3, "click", /*click_handler_7*/ ctx[34], false, false, false),
    				listen_dev(button4, "click", /*click_handler_8*/ ctx[35], false, false, false),
    				listen_dev(button7, "click", /*closeMainWindow*/ ctx[7], false, false, false)
    			];
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div18, anchor);
    			append_dev(div18, h1);
    			append_dev(h1, img0);
    			append_dev(div18, t0);
    			append_dev(div18, div6);
    			append_dev(div6, div2);
    			append_dev(div2, img1);
    			append_dev(div2, t1);
    			append_dev(div2, div1);
    			append_dev(div1, p0);
    			append_dev(div1, t3);
    			append_dev(div1, div0);
    			append_dev(div0, input0);
    			set_input_value(input0, /*config*/ ctx[0].main.soundVolume);
    			append_dev(div0, t4);
    			append_dev(div0, p1);
    			append_dev(p1, t5);
    			append_dev(div6, t6);
    			append_dev(div6, div5);
    			append_dev(div5, img2);
    			append_dev(div5, t7);
    			append_dev(div5, div4);
    			append_dev(div4, p2);
    			append_dev(div4, t9);
    			append_dev(div4, div3);
    			append_dev(div3, input1);
    			set_input_value(input1, /*config*/ ctx[0].main.microphoneVolume);
    			append_dev(div3, t10);
    			append_dev(div3, p3);
    			append_dev(p3, t11);
    			append_dev(div18, t12);
    			append_dev(div18, div8);
    			append_dev(div8, p4);
    			append_dev(div8, t14);
    			append_dev(div8, div7);
    			append_dev(div7, button0);
    			append_dev(div7, t16);
    			append_dev(div7, button1);
    			append_dev(div7, t18);
    			append_dev(div7, button2);
    			append_dev(div18, t20);
    			append_dev(div18, div11);
    			append_dev(div11, div9);
    			append_dev(div9, p5);
    			append_dev(div9, t22);
    			append_dev(div9, input2);
    			input2.checked = /*config*/ ctx[0].main.triggerOnOffSound;
    			append_dev(div9, t23);
    			append_dev(div9, label0);
    			append_dev(div11, t24);
    			append_dev(div11, div10);
    			append_dev(div10, p6);
    			append_dev(div10, t26);
    			append_dev(div10, input3);
    			input3.checked = /*config*/ ctx[0].main.triggerSound3D;
    			append_dev(div10, t27);
    			append_dev(div10, label1);
    			append_dev(div18, t28);
    			append_dev(div18, div16);
    			append_dev(div16, div13);
    			append_dev(div13, div12);
    			append_dev(div12, p7);
    			append_dev(div12, t30);
    			append_dev(div12, input4);
    			input4.checked = /*config*/ ctx[0].main.inputmode;
    			append_dev(div12, t31);
    			append_dev(div12, label2);
    			append_dev(div13, t32);
    			if (if_block) if_block.m(div13, null);
    			append_dev(div16, t33);
    			append_dev(div16, div15);
    			append_dev(div15, button3);
    			append_dev(div15, t35);
    			append_dev(div15, button4);
    			append_dev(div15, t37);
    			append_dev(div15, div14);
    			append_dev(div14, p8);
    			append_dev(div15, t39);
    			append_dev(div15, table);
    			append_dev(table, tbody);
    			append_dev(tbody, tr0);
    			append_dev(tr0, th0);
    			append_dev(th0, img3);
    			append_dev(tr0, t40);
    			append_dev(tr0, th1);
    			append_dev(th1, p9);
    			append_dev(tr0, t42);
    			append_dev(tr0, th2);
    			append_dev(th2, button5);
    			append_dev(tbody, t44);
    			append_dev(tbody, tr1);
    			append_dev(tr1, th3);
    			append_dev(th3, img4);
    			append_dev(tr1, t45);
    			append_dev(tr1, th4);
    			append_dev(th4, p10);
    			append_dev(tr1, t47);
    			append_dev(tr1, th5);
    			append_dev(th5, button6);
    			append_dev(div18, t49);
    			append_dev(div18, div17);
    			append_dev(div17, button7);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*config*/ 1) {
    				set_style(input0, "--columns", /*config*/ ctx[0].main.soundVolume + "%");
    			}

    			if (dirty[0] & /*config*/ 1) {
    				set_input_value(input0, /*config*/ ctx[0].main.soundVolume);
    			}

    			if (dirty[0] & /*config*/ 1 && t5_value !== (t5_value = /*config*/ ctx[0].main.soundVolume + "")) set_data_dev(t5, t5_value);

    			if (dirty[0] & /*config*/ 1) {
    				set_style(input1, "--columns", /*config*/ ctx[0].main.microphoneVolume + "%");
    			}

    			if (dirty[0] & /*config*/ 1) {
    				set_input_value(input1, /*config*/ ctx[0].main.microphoneVolume);
    			}

    			if (dirty[0] & /*config*/ 1 && t11_value !== (t11_value = /*config*/ ctx[0].main.microphoneVolume + "")) set_data_dev(t11, t11_value);

    			if (dirty[0] & /*config*/ 1) {
    				input2.checked = /*config*/ ctx[0].main.triggerOnOffSound;
    			}

    			if (dirty[0] & /*config*/ 1) {
    				input3.checked = /*config*/ ctx[0].main.triggerSound3D;
    			}

    			if (dirty[0] & /*config*/ 1) {
    				input4.checked = /*config*/ ctx[0].main.inputmode;
    			}

    			if (!/*config*/ ctx[0].main.inputmode) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_1(ctx);
    					if_block.c();
    					if_block.m(div13, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div18);
    			if (if_block) if_block.d();
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(923:1) {#if gui.mainWindowOpen}",
    		ctx
    	});

    	return block;
    }

    // (975:5) {#if !config.main.inputmode}
    function create_if_block_1(ctx) {
    	let div3;
    	let ul;
    	let li0;
    	let input0;
    	let input0_value_value;
    	let t0;
    	let label0;
    	let div0;
    	let t2;
    	let li1;
    	let input1;
    	let input1_value_value;
    	let t3;
    	let label1;
    	let div1;
    	let t5;
    	let li2;
    	let input2;
    	let input2_value_value;
    	let t6;
    	let label2;
    	let div2;
    	let dispose;

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			ul = element("ul");
    			li0 = element("li");
    			input0 = element("input");
    			t0 = space();
    			label0 = element("label");
    			div0 = element("div");
    			div0.textContent = "По голосу";
    			t2 = space();
    			li1 = element("li");
    			input1 = element("input");
    			t3 = space();
    			label1 = element("label");
    			div1 = element("div");
    			div1.textContent = "При удердании";
    			t5 = space();
    			li2 = element("li");
    			input2 = element("input");
    			t6 = space();
    			label2 = element("label");
    			div2 = element("div");
    			div2.textContent = "Переключение по клавише";
    			attr_dev(input0, "type", "radio");
    			input0.__value = input0_value_value = 1;
    			input0.value = input0.__value;
    			attr_dev(input0, "id", "radio1");
    			attr_dev(input0, "name", "radio");
    			attr_dev(input0, "class", "input svelte-k3eom2");
    			/*$$binding_groups*/ ctx[15][0].push(input0);
    			add_location(input0, file, 978, 8, 23832);
    			attr_dev(div0, "class", "button selector A svelte-k3eom2");
    			add_location(div0, file, 979, 28, 23970);
    			attr_dev(label0, "for", "radio1");
    			attr_dev(label0, "class", "svelte-k3eom2");
    			add_location(label0, file, 979, 8, 23950);
    			attr_dev(li0, "class", "li svelte-k3eom2");
    			add_location(li0, file, 977, 7, 23808);
    			attr_dev(input1, "type", "radio");
    			input1.__value = input1_value_value = 2;
    			input1.value = input1.__value;
    			attr_dev(input1, "id", "radio2");
    			attr_dev(input1, "name", "radio");
    			attr_dev(input1, "class", "input svelte-k3eom2");
    			/*$$binding_groups*/ ctx[15][0].push(input1);
    			add_location(input1, file, 982, 8, 24069);
    			attr_dev(div1, "class", "button selector A svelte-k3eom2");
    			add_location(div1, file, 983, 28, 24207);
    			attr_dev(label1, "for", "radio2");
    			attr_dev(label1, "class", "svelte-k3eom2");
    			add_location(label1, file, 983, 8, 24187);
    			attr_dev(li1, "class", "li svelte-k3eom2");
    			add_location(li1, file, 981, 7, 24045);
    			attr_dev(input2, "type", "radio");
    			input2.__value = input2_value_value = 3;
    			input2.value = input2.__value;
    			attr_dev(input2, "id", "radio3");
    			attr_dev(input2, "name", "radio");
    			attr_dev(input2, "class", "input svelte-k3eom2");
    			/*$$binding_groups*/ ctx[15][0].push(input2);
    			add_location(input2, file, 986, 8, 24310);
    			attr_dev(div2, "class", "button selector A svelte-k3eom2");
    			add_location(div2, file, 987, 28, 24448);
    			attr_dev(label2, "for", "radio3");
    			attr_dev(label2, "class", "svelte-k3eom2");
    			add_location(label2, file, 987, 8, 24428);
    			attr_dev(li2, "class", "li svelte-k3eom2");
    			add_location(li2, file, 985, 7, 24286);
    			attr_dev(ul, "class", "ul svelte-k3eom2");
    			add_location(ul, file, 976, 6, 23785);
    			attr_dev(div3, "id", "inputmode");
    			attr_dev(div3, "class", "inputmode svelte-k3eom2");
    			add_location(div3, file, 975, 5, 23740);

    			dispose = [
    				listen_dev(input0, "change", /*input0_change_handler*/ ctx[31]),
    				listen_dev(input1, "change", /*input1_change_handler*/ ctx[32]),
    				listen_dev(input2, "change", /*input2_change_handler_1*/ ctx[33])
    			];
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, ul);
    			append_dev(ul, li0);
    			append_dev(li0, input0);
    			input0.checked = input0.__value === /*config*/ ctx[0].main.inputModeRadio;
    			append_dev(li0, t0);
    			append_dev(li0, label0);
    			append_dev(label0, div0);
    			append_dev(ul, t2);
    			append_dev(ul, li1);
    			append_dev(li1, input1);
    			input1.checked = input1.__value === /*config*/ ctx[0].main.inputModeRadio;
    			append_dev(li1, t3);
    			append_dev(li1, label1);
    			append_dev(label1, div1);
    			append_dev(ul, t5);
    			append_dev(ul, li2);
    			append_dev(li2, input2);
    			input2.checked = input2.__value === /*config*/ ctx[0].main.inputModeRadio;
    			append_dev(li2, t6);
    			append_dev(li2, label2);
    			append_dev(label2, div2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*config*/ 1) {
    				input0.checked = input0.__value === /*config*/ ctx[0].main.inputModeRadio;
    			}

    			if (dirty[0] & /*config*/ 1) {
    				input1.checked = input1.__value === /*config*/ ctx[0].main.inputModeRadio;
    			}

    			if (dirty[0] & /*config*/ 1) {
    				input2.checked = input2.__value === /*config*/ ctx[0].main.inputModeRadio;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    			/*$$binding_groups*/ ctx[15][0].splice(/*$$binding_groups*/ ctx[15][0].indexOf(input0), 1);
    			/*$$binding_groups*/ ctx[15][0].splice(/*$$binding_groups*/ ctx[15][0].indexOf(input1), 1);
    			/*$$binding_groups*/ ctx[15][0].splice(/*$$binding_groups*/ ctx[15][0].indexOf(input2), 1);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(975:5) {#if !config.main.inputmode}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let div2;
    	let t0;
    	let t1;
    	let t2;
    	let t3;
    	let t4;
    	let t5;
    	let div1;
    	let div0;
    	let table0;
    	let thead0;
    	let tr0;
    	let th0;
    	let img0;
    	let img0_src_value;
    	let t6;
    	let th1;
    	let p0;
    	let t8;
    	let tbody0;
    	let tr1;
    	let th2;
    	let img1;
    	let img1_src_value;
    	let t9;
    	let th3;
    	let p1;
    	let t11;
    	let th4;
    	let p2;
    	let t13;
    	let tr2;
    	let th5;
    	let img2;
    	let img2_src_value;
    	let t14;
    	let th6;
    	let p3;
    	let t16;
    	let th7;
    	let p4;
    	let t18;
    	let tr3;
    	let th8;
    	let img3;
    	let img3_src_value;
    	let t19;
    	let th9;
    	let p5;
    	let t21;
    	let th10;
    	let p6;
    	let t23;
    	let tr4;
    	let th11;
    	let img4;
    	let img4_src_value;
    	let t24;
    	let th12;
    	let p7;
    	let t26;
    	let th13;
    	let p8;
    	let t28;
    	let tr5;
    	let th14;
    	let img5;
    	let img5_src_value;
    	let t29;
    	let th15;
    	let p9;
    	let t31;
    	let th16;
    	let p10;
    	let t33;
    	let table1;
    	let thead1;
    	let tr6;
    	let th17;
    	let img6;
    	let img6_src_value;
    	let t34;
    	let th18;
    	let p11;
    	let t36;
    	let tbody1;
    	let tr7;
    	let th19;
    	let img7;
    	let img7_src_value;
    	let t37;
    	let th20;
    	let p12;
    	let t39;
    	let th21;
    	let p13;
    	let t41;
    	let tr8;
    	let th22;
    	let img8;
    	let img8_src_value;
    	let t42;
    	let th23;
    	let p14;
    	let t44;
    	let th24;
    	let p15;
    	let t46;
    	let img9;
    	let img9_src_value;
    	let t47;
    	let img10;
    	let img10_src_value;
    	let dispose;
    	let if_block0 = /*gui*/ ctx[2].deviceSelectOpen && create_if_block_7(ctx);
    	let if_block1 = /*gui*/ ctx[2].mutList && create_if_block_6(ctx);
    	let if_block2 = /*gui*/ ctx[2].roomSelectOpen && create_if_block_5(ctx);
    	let if_block3 = /*gui*/ ctx[2].channelSelectOpen && create_if_block_4(ctx);
    	let if_block4 = /*gui*/ ctx[2].volumeMainWindow && create_if_block_2(ctx);
    	let if_block5 = /*gui*/ ctx[2].mainWindowOpen && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			if (if_block0) if_block0.c();
    			t0 = space();
    			if (if_block1) if_block1.c();
    			t1 = space();
    			if (if_block2) if_block2.c();
    			t2 = space();
    			if (if_block3) if_block3.c();
    			t3 = space();
    			if (if_block4) if_block4.c();
    			t4 = space();
    			if (if_block5) if_block5.c();
    			t5 = space();
    			div1 = element("div");
    			div0 = element("div");
    			table0 = element("table");
    			thead0 = element("thead");
    			tr0 = element("tr");
    			th0 = element("th");
    			img0 = element("img");
    			t6 = space();
    			th1 = element("th");
    			p0 = element("p");
    			p0.textContent = "Общий";
    			t8 = space();
    			tbody0 = element("tbody");
    			tr1 = element("tr");
    			th2 = element("th");
    			img1 = element("img");
    			t9 = space();
    			th3 = element("th");
    			p1 = element("p");
    			p1.textContent = "Vf";
    			t11 = space();
    			th4 = element("th");
    			p2 = element("p");
    			p2.textContent = "100m.";
    			t13 = space();
    			tr2 = element("tr");
    			th5 = element("th");
    			img2 = element("img");
    			t14 = space();
    			th6 = element("th");
    			p3 = element("p");
    			p3.textContent = "Vf";
    			t16 = space();
    			th7 = element("th");
    			p4 = element("p");
    			p4.textContent = "100m.";
    			t18 = space();
    			tr3 = element("tr");
    			th8 = element("th");
    			img3 = element("img");
    			t19 = space();
    			th9 = element("th");
    			p5 = element("p");
    			p5.textContent = "Vf";
    			t21 = space();
    			th10 = element("th");
    			p6 = element("p");
    			p6.textContent = "100m.";
    			t23 = space();
    			tr4 = element("tr");
    			th11 = element("th");
    			img4 = element("img");
    			t24 = space();
    			th12 = element("th");
    			p7 = element("p");
    			p7.textContent = "Vf";
    			t26 = space();
    			th13 = element("th");
    			p8 = element("p");
    			p8.textContent = "100m.";
    			t28 = space();
    			tr5 = element("tr");
    			th14 = element("th");
    			img5 = element("img");
    			t29 = space();
    			th15 = element("th");
    			p9 = element("p");
    			p9.textContent = "Vf";
    			t31 = space();
    			th16 = element("th");
    			p10 = element("p");
    			p10.textContent = "100m.";
    			t33 = space();
    			table1 = element("table");
    			thead1 = element("thead");
    			tr6 = element("tr");
    			th17 = element("th");
    			img6 = element("img");
    			t34 = space();
    			th18 = element("th");
    			p11 = element("p");
    			p11.textContent = "Рация";
    			t36 = space();
    			tbody1 = element("tbody");
    			tr7 = element("tr");
    			th19 = element("th");
    			img7 = element("img");
    			t37 = space();
    			th20 = element("th");
    			p12 = element("p");
    			p12.textContent = "Vf";
    			t39 = space();
    			th21 = element("th");
    			p13 = element("p");
    			p13.textContent = "[текст]";
    			t41 = space();
    			tr8 = element("tr");
    			th22 = element("th");
    			img8 = element("img");
    			t42 = space();
    			th23 = element("th");
    			p14 = element("p");
    			p14.textContent = "Vf";
    			t44 = space();
    			th24 = element("th");
    			p15 = element("p");
    			p15.textContent = "[текст]";
    			t46 = space();
    			img9 = element("img");
    			t47 = space();
    			img10 = element("img");
    			attr_dev(img0, "class", "owerlayRadiomin svelte-k3eom2");
    			if (img0.src !== (img0_src_value = "img/radiomin.png")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "alt", "owerlayRadiomin");
    			add_location(img0, file, 1025, 10, 25887);
    			attr_dev(th0, "class", "svelte-k3eom2");
    			add_location(th0, file, 1025, 6, 25883);
    			attr_dev(p0, "class", "owerlayRoomName svelte-k3eom2");
    			attr_dev(p0, "id", "owerlayRoomName");
    			add_location(p0, file, 1026, 10, 25977);
    			attr_dev(th1, "class", "svelte-k3eom2");
    			add_location(th1, file, 1026, 6, 25973);
    			attr_dev(tr0, "class", "svelte-k3eom2");
    			add_location(tr0, file, 1024, 5, 25872);
    			attr_dev(thead0, "class", "svelte-k3eom2");
    			add_location(thead0, file, 1023, 4, 25859);
    			attr_dev(img1, "class", "owerlayRadiominImg svelte-k3eom2");
    			if (img1.src !== (img1_src_value = "img/owerlayVolume.png")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "alt", "owerlayRadiomin");
    			add_location(img1, file, 1031, 10, 26096);
    			attr_dev(th2, "class", "svelte-k3eom2");
    			add_location(th2, file, 1031, 6, 26092);
    			attr_dev(p1, "class", "owerlayPlayer svelte-k3eom2");
    			attr_dev(p1, "id", "owerlayPlayer");
    			add_location(p1, file, 1032, 10, 26194);
    			attr_dev(th3, "class", "svelte-k3eom2");
    			add_location(th3, file, 1032, 6, 26190);
    			attr_dev(p2, "class", "owerlayPlayerDistance svelte-k3eom2");
    			attr_dev(p2, "id", "owerlayPlayerDistance");
    			add_location(p2, file, 1033, 10, 26260);
    			attr_dev(th4, "class", "svelte-k3eom2");
    			add_location(th4, file, 1033, 6, 26256);
    			attr_dev(tr1, "class", "svelte-k3eom2");
    			add_location(tr1, file, 1030, 5, 26081);
    			attr_dev(img2, "class", "owerlayRadiominImg svelte-k3eom2");
    			if (img2.src !== (img2_src_value = "img/owerlayVolume.png")) attr_dev(img2, "src", img2_src_value);
    			attr_dev(img2, "alt", "owerlayRadiomin");
    			add_location(img2, file, 1036, 10, 26366);
    			attr_dev(th5, "class", "svelte-k3eom2");
    			add_location(th5, file, 1036, 6, 26362);
    			attr_dev(p3, "class", "owerlayPlayer svelte-k3eom2");
    			attr_dev(p3, "id", "owerlayPlayer");
    			add_location(p3, file, 1037, 10, 26464);
    			attr_dev(th6, "class", "svelte-k3eom2");
    			add_location(th6, file, 1037, 6, 26460);
    			attr_dev(p4, "class", "owerlayPlayerDistance svelte-k3eom2");
    			attr_dev(p4, "id", "owerlayPlayerDistance");
    			add_location(p4, file, 1038, 10, 26530);
    			attr_dev(th7, "class", "svelte-k3eom2");
    			add_location(th7, file, 1038, 6, 26526);
    			attr_dev(tr2, "class", "svelte-k3eom2");
    			add_location(tr2, file, 1035, 5, 26351);
    			attr_dev(img3, "class", "owerlayRadiominImg svelte-k3eom2");
    			if (img3.src !== (img3_src_value = "img/owerlayVolume.png")) attr_dev(img3, "src", img3_src_value);
    			attr_dev(img3, "alt", "owerlayRadiomin");
    			add_location(img3, file, 1041, 10, 26636);
    			attr_dev(th8, "class", "svelte-k3eom2");
    			add_location(th8, file, 1041, 6, 26632);
    			attr_dev(p5, "class", "owerlayPlayer svelte-k3eom2");
    			attr_dev(p5, "id", "owerlayPlayer");
    			add_location(p5, file, 1042, 10, 26734);
    			attr_dev(th9, "class", "svelte-k3eom2");
    			add_location(th9, file, 1042, 6, 26730);
    			attr_dev(p6, "class", "owerlayPlayerDistance svelte-k3eom2");
    			attr_dev(p6, "id", "owerlayPlayerDistance");
    			add_location(p6, file, 1043, 10, 26800);
    			attr_dev(th10, "class", "svelte-k3eom2");
    			add_location(th10, file, 1043, 6, 26796);
    			attr_dev(tr3, "class", "svelte-k3eom2");
    			add_location(tr3, file, 1040, 5, 26621);
    			attr_dev(img4, "class", "owerlayRadiominImg svelte-k3eom2");
    			if (img4.src !== (img4_src_value = "img/owerlayVolume.png")) attr_dev(img4, "src", img4_src_value);
    			attr_dev(img4, "alt", "owerlayRadiomin");
    			add_location(img4, file, 1046, 10, 26906);
    			attr_dev(th11, "class", "svelte-k3eom2");
    			add_location(th11, file, 1046, 6, 26902);
    			attr_dev(p7, "class", "owerlayPlayer svelte-k3eom2");
    			attr_dev(p7, "id", "owerlayPlayer");
    			add_location(p7, file, 1047, 10, 27004);
    			attr_dev(th12, "class", "svelte-k3eom2");
    			add_location(th12, file, 1047, 6, 27000);
    			attr_dev(p8, "class", "owerlayPlayerDistance svelte-k3eom2");
    			attr_dev(p8, "id", "owerlayPlayerDistance");
    			add_location(p8, file, 1048, 10, 27070);
    			attr_dev(th13, "class", "svelte-k3eom2");
    			add_location(th13, file, 1048, 6, 27066);
    			attr_dev(tr4, "class", "svelte-k3eom2");
    			add_location(tr4, file, 1045, 5, 26891);
    			attr_dev(img5, "class", "owerlayRadiominImg svelte-k3eom2");
    			if (img5.src !== (img5_src_value = "img/owerlayVolume.png")) attr_dev(img5, "src", img5_src_value);
    			attr_dev(img5, "alt", "owerlayRadiomin");
    			add_location(img5, file, 1051, 10, 27176);
    			attr_dev(th14, "class", "svelte-k3eom2");
    			add_location(th14, file, 1051, 6, 27172);
    			attr_dev(p9, "class", "owerlayPlayer svelte-k3eom2");
    			attr_dev(p9, "id", "owerlayPlayer");
    			add_location(p9, file, 1052, 10, 27274);
    			attr_dev(th15, "class", "svelte-k3eom2");
    			add_location(th15, file, 1052, 6, 27270);
    			attr_dev(p10, "class", "owerlayPlayerDistance svelte-k3eom2");
    			attr_dev(p10, "id", "owerlayPlayerDistance");
    			add_location(p10, file, 1053, 10, 27340);
    			attr_dev(th16, "class", "svelte-k3eom2");
    			add_location(th16, file, 1053, 6, 27336);
    			attr_dev(tr5, "class", "svelte-k3eom2");
    			add_location(tr5, file, 1050, 5, 27161);
    			attr_dev(tbody0, "class", "svelte-k3eom2");
    			add_location(tbody0, file, 1029, 4, 26068);
    			attr_dev(table0, "class", "svelte-k3eom2");
    			add_location(table0, file, 1022, 3, 25847);
    			attr_dev(img6, "class", "owerlayRadiomin svelte-k3eom2");
    			if (img6.src !== (img6_src_value = "img/radiomin.png")) attr_dev(img6, "src", img6_src_value);
    			attr_dev(img6, "alt", "owerlayRadiomin");
    			add_location(img6, file, 1060, 10, 27494);
    			attr_dev(th17, "class", "svelte-k3eom2");
    			add_location(th17, file, 1060, 6, 27490);
    			attr_dev(p11, "class", "owerlayRoomName svelte-k3eom2");
    			attr_dev(p11, "id", "owerlayRoomName");
    			add_location(p11, file, 1061, 10, 27584);
    			attr_dev(th18, "class", "svelte-k3eom2");
    			add_location(th18, file, 1061, 6, 27580);
    			attr_dev(tr6, "class", "svelte-k3eom2");
    			add_location(tr6, file, 1059, 5, 27479);
    			attr_dev(thead1, "class", "svelte-k3eom2");
    			add_location(thead1, file, 1058, 4, 27466);
    			attr_dev(img7, "class", "owerlayRadiominImg svelte-k3eom2");
    			if (img7.src !== (img7_src_value = "img/owerlayVolume.png")) attr_dev(img7, "src", img7_src_value);
    			attr_dev(img7, "alt", "owerlayRadiomin");
    			add_location(img7, file, 1066, 10, 27703);
    			attr_dev(th19, "class", "svelte-k3eom2");
    			add_location(th19, file, 1066, 6, 27699);
    			attr_dev(p12, "class", "owerlayPlayer svelte-k3eom2");
    			attr_dev(p12, "id", "owerlayPlayer");
    			add_location(p12, file, 1067, 10, 27801);
    			attr_dev(th20, "class", "svelte-k3eom2");
    			add_location(th20, file, 1067, 6, 27797);
    			attr_dev(p13, "class", "owerlayPlayerDistance svelte-k3eom2");
    			attr_dev(p13, "id", "owerlayPlayerDistance");
    			add_location(p13, file, 1068, 10, 27867);
    			attr_dev(th21, "class", "svelte-k3eom2");
    			add_location(th21, file, 1068, 6, 27863);
    			attr_dev(tr7, "class", "svelte-k3eom2");
    			add_location(tr7, file, 1065, 5, 27688);
    			attr_dev(img8, "class", "owerlayRadiominImg svelte-k3eom2");
    			if (img8.src !== (img8_src_value = "img/owerlayVolume.png")) attr_dev(img8, "src", img8_src_value);
    			attr_dev(img8, "alt", "owerlayRadiomin");
    			add_location(img8, file, 1071, 10, 27975);
    			attr_dev(th22, "class", "svelte-k3eom2");
    			add_location(th22, file, 1071, 6, 27971);
    			attr_dev(p14, "class", "owerlayPlayer svelte-k3eom2");
    			attr_dev(p14, "id", "owerlayPlayer");
    			add_location(p14, file, 1072, 10, 28073);
    			attr_dev(th23, "class", "svelte-k3eom2");
    			add_location(th23, file, 1072, 6, 28069);
    			attr_dev(p15, "class", "owerlayPlayerDistance svelte-k3eom2");
    			attr_dev(p15, "id", "owerlayPlayerDistance");
    			add_location(p15, file, 1073, 10, 28139);
    			attr_dev(th24, "class", "svelte-k3eom2");
    			add_location(th24, file, 1073, 6, 28135);
    			attr_dev(tr8, "class", "svelte-k3eom2");
    			add_location(tr8, file, 1070, 5, 27960);
    			attr_dev(tbody1, "class", "svelte-k3eom2");
    			add_location(tbody1, file, 1064, 4, 27675);
    			attr_dev(table1, "class", "svelte-k3eom2");
    			add_location(table1, file, 1057, 3, 27454);
    			attr_dev(div0, "id", "owerlay");
    			attr_dev(div0, "class", "owerlay svelte-k3eom2");
    			set_style(div0, "--left", /*move*/ ctx[3].owerlay.left + "px");
    			set_style(div0, "--top", /*move*/ ctx[3].owerlay.top + "px");
    			add_location(div0, file, 1021, 2, 25739);
    			attr_dev(img9, "draggable", "false");
    			attr_dev(img9, "class", "owerlayMicrophone svelte-k3eom2");
    			attr_dev(img9, "id", "owerlayMicrophone");
    			if (img9.src !== (img9_src_value = "img/owerlayMicrophone.png")) attr_dev(img9, "src", img9_src_value);
    			attr_dev(img9, "alt", "owerlayMicrophone");
    			set_style(img9, "--left", /*move*/ ctx[3].owerlayMicrophone.left + "px");
    			set_style(img9, "--top", /*move*/ ctx[3].owerlayMicrophone.top + "px");
    			add_location(img9, file, 1078, 2, 28263);
    			attr_dev(img10, "draggable", "false");
    			attr_dev(img10, "class", "owerlayVolumeOn svelte-k3eom2");
    			attr_dev(img10, "id", "owerlayVolumeOn");
    			if (img10.src !== (img10_src_value = "img/owerlayVolumeOn.png")) attr_dev(img10, "src", img10_src_value);
    			attr_dev(img10, "alt", "owerlayVolumeOn");
    			set_style(img10, "--left", /*move*/ ctx[3].owerlayVolumeOn.left + "px");
    			set_style(img10, "--top", /*move*/ ctx[3].owerlayVolumeOn.top + "px");
    			add_location(img10, file, 1085, 2, 28503);
    			attr_dev(div1, "class", "svelte-k3eom2");
    			add_location(div1, file, 1020, 1, 25731);
    			attr_dev(div2, "id", "mainWindow");
    			set_style(div2, "background-image", "url(img/dsfghdfshsdg.png)");
    			attr_dev(div2, "oncontextmenu", "return false");
    			attr_dev(div2, "class", "svelte-k3eom2");
    			add_location(div2, file, 796, 0, 15389);

    			dispose = [
    				listen_dev(window, "mousemove", /*mousemove_handler*/ ctx[11], false, false, false),
    				listen_dev(window, "mousedown", /*mousedown_handler*/ ctx[12], false, false, false),
    				listen_dev(window, "mouseup", /*mouseup_handler*/ ctx[13], false, false, false),
    				listen_dev(window, "keydown", /*keydown*/ ctx[6], false, false, false)
    			];
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			if (if_block0) if_block0.m(div2, null);
    			append_dev(div2, t0);
    			if (if_block1) if_block1.m(div2, null);
    			append_dev(div2, t1);
    			if (if_block2) if_block2.m(div2, null);
    			append_dev(div2, t2);
    			if (if_block3) if_block3.m(div2, null);
    			append_dev(div2, t3);
    			if (if_block4) if_block4.m(div2, null);
    			append_dev(div2, t4);
    			if (if_block5) if_block5.m(div2, null);
    			append_dev(div2, t5);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			append_dev(div0, table0);
    			append_dev(table0, thead0);
    			append_dev(thead0, tr0);
    			append_dev(tr0, th0);
    			append_dev(th0, img0);
    			append_dev(tr0, t6);
    			append_dev(tr0, th1);
    			append_dev(th1, p0);
    			append_dev(table0, t8);
    			append_dev(table0, tbody0);
    			append_dev(tbody0, tr1);
    			append_dev(tr1, th2);
    			append_dev(th2, img1);
    			append_dev(tr1, t9);
    			append_dev(tr1, th3);
    			append_dev(th3, p1);
    			append_dev(tr1, t11);
    			append_dev(tr1, th4);
    			append_dev(th4, p2);
    			append_dev(tbody0, t13);
    			append_dev(tbody0, tr2);
    			append_dev(tr2, th5);
    			append_dev(th5, img2);
    			append_dev(tr2, t14);
    			append_dev(tr2, th6);
    			append_dev(th6, p3);
    			append_dev(tr2, t16);
    			append_dev(tr2, th7);
    			append_dev(th7, p4);
    			append_dev(tbody0, t18);
    			append_dev(tbody0, tr3);
    			append_dev(tr3, th8);
    			append_dev(th8, img3);
    			append_dev(tr3, t19);
    			append_dev(tr3, th9);
    			append_dev(th9, p5);
    			append_dev(tr3, t21);
    			append_dev(tr3, th10);
    			append_dev(th10, p6);
    			append_dev(tbody0, t23);
    			append_dev(tbody0, tr4);
    			append_dev(tr4, th11);
    			append_dev(th11, img4);
    			append_dev(tr4, t24);
    			append_dev(tr4, th12);
    			append_dev(th12, p7);
    			append_dev(tr4, t26);
    			append_dev(tr4, th13);
    			append_dev(th13, p8);
    			append_dev(tbody0, t28);
    			append_dev(tbody0, tr5);
    			append_dev(tr5, th14);
    			append_dev(th14, img5);
    			append_dev(tr5, t29);
    			append_dev(tr5, th15);
    			append_dev(th15, p9);
    			append_dev(tr5, t31);
    			append_dev(tr5, th16);
    			append_dev(th16, p10);
    			append_dev(div0, t33);
    			append_dev(div0, table1);
    			append_dev(table1, thead1);
    			append_dev(thead1, tr6);
    			append_dev(tr6, th17);
    			append_dev(th17, img6);
    			append_dev(tr6, t34);
    			append_dev(tr6, th18);
    			append_dev(th18, p11);
    			append_dev(table1, t36);
    			append_dev(table1, tbody1);
    			append_dev(tbody1, tr7);
    			append_dev(tr7, th19);
    			append_dev(th19, img7);
    			append_dev(tr7, t37);
    			append_dev(tr7, th20);
    			append_dev(th20, p12);
    			append_dev(tr7, t39);
    			append_dev(tr7, th21);
    			append_dev(th21, p13);
    			append_dev(tbody1, t41);
    			append_dev(tbody1, tr8);
    			append_dev(tr8, th22);
    			append_dev(th22, img8);
    			append_dev(tr8, t42);
    			append_dev(tr8, th23);
    			append_dev(th23, p14);
    			append_dev(tr8, t44);
    			append_dev(tr8, th24);
    			append_dev(th24, p15);
    			append_dev(div1, t46);
    			append_dev(div1, img9);
    			append_dev(div1, t47);
    			append_dev(div1, img10);
    		},
    		p: function update(ctx, dirty) {
    			if (/*gui*/ ctx[2].deviceSelectOpen) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_7(ctx);
    					if_block0.c();
    					if_block0.m(div2, t0);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*gui*/ ctx[2].mutList) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_6(ctx);
    					if_block1.c();
    					if_block1.m(div2, t1);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (/*gui*/ ctx[2].roomSelectOpen) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);
    				} else {
    					if_block2 = create_if_block_5(ctx);
    					if_block2.c();
    					if_block2.m(div2, t2);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}

    			if (/*gui*/ ctx[2].channelSelectOpen) {
    				if (if_block3) {
    					if_block3.p(ctx, dirty);
    				} else {
    					if_block3 = create_if_block_4(ctx);
    					if_block3.c();
    					if_block3.m(div2, t3);
    				}
    			} else if (if_block3) {
    				if_block3.d(1);
    				if_block3 = null;
    			}

    			if (/*gui*/ ctx[2].volumeMainWindow) {
    				if (if_block4) {
    					if_block4.p(ctx, dirty);
    				} else {
    					if_block4 = create_if_block_2(ctx);
    					if_block4.c();
    					if_block4.m(div2, t4);
    				}
    			} else if (if_block4) {
    				if_block4.d(1);
    				if_block4 = null;
    			}

    			if (/*gui*/ ctx[2].mainWindowOpen) {
    				if (if_block5) {
    					if_block5.p(ctx, dirty);
    				} else {
    					if_block5 = create_if_block(ctx);
    					if_block5.c();
    					if_block5.m(div2, t5);
    				}
    			} else if (if_block5) {
    				if_block5.d(1);
    				if_block5 = null;
    			}

    			if (dirty[0] & /*move*/ 8) {
    				set_style(div0, "--left", /*move*/ ctx[3].owerlay.left + "px");
    			}

    			if (dirty[0] & /*move*/ 8) {
    				set_style(div0, "--top", /*move*/ ctx[3].owerlay.top + "px");
    			}

    			if (dirty[0] & /*move*/ 8) {
    				set_style(img9, "--left", /*move*/ ctx[3].owerlayMicrophone.left + "px");
    			}

    			if (dirty[0] & /*move*/ 8) {
    				set_style(img9, "--top", /*move*/ ctx[3].owerlayMicrophone.top + "px");
    			}

    			if (dirty[0] & /*move*/ 8) {
    				set_style(img10, "--left", /*move*/ ctx[3].owerlayVolumeOn.left + "px");
    			}

    			if (dirty[0] & /*move*/ 8) {
    				set_style(img10, "--top", /*move*/ ctx[3].owerlayVolumeOn.top + "px");
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			if (if_block2) if_block2.d();
    			if (if_block3) if_block3.d();
    			if (if_block4) if_block4.d();
    			if (if_block5) if_block5.d();
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	const config = {
    		main: {
    			soundVolume: 50,
    			microphoneVolume: 50,
    			triggerOnOffSound: true,
    			triggerSound3D: true,
    			inputmode: false,
    			inputModeRadio: 1,
    			inputModeRadioDevice: 1,
    			kiGlobal: "A",
    			kiRadio: "B"
    		},
    		selectDevice: 0,
    		device: ["microphone1", "microphone2", "microphone3", "microphone4", "microphone5"],
    		selectRoom: 0,
    		room: ["Room1", "Room2", "Room3", "Room4"],
    		selectchannel: 0,
    		channel: ["Channel1", "Channel2", "Channel3", "Channel4"]
    	};

    	const mutList = ["Vf", "Vf1", "Vf2", "Vf3", "Vf4", "Vf5"];
    	const volumeWindowRoom = ["Общий", "Рация1", "Рация2"];

    	const volumeWindowPlayer = [
    		{ name: "Vf1", room: 0, value: 50 },
    		{ name: "Vf2", room: 0, value: 50 },
    		{ name: "Vf3", room: 0, value: 50 },
    		{ name: "Vf4", room: 0, value: 50 },
    		{ name: "Vf5", room: 0, value: 50 },
    		{ name: "Vf6", room: 1, value: 50 },
    		{ name: "Vf7", room: 1, value: 50 },
    		{ name: "Vf8", room: 1, value: 50 },
    		{ name: "Vf9", room: 1, value: 50 },
    		{ name: "Vf10", room: 1, value: 50 },
    		{ name: "Vf11", room: 2, value: 50 },
    		{ name: "Vf12", room: 2, value: 50 },
    		{ name: "Vf13", room: 2, value: 50 },
    		{ name: "Vf14", room: 2, value: 50 },
    		{ name: "Vf15", room: 2, value: 50 }
    	];

    	const gui = {
    		mainWindowOpen: true,
    		deviceSelectOpen: false,
    		roomSelectOpen: false,
    		channelSelectOpen: false,
    		mutList: false,
    		volumeMainWindow: false
    	};

    	const move = {
    		nowMove: "",
    		ismove: false,
    		elem: { shiftX: 0, shiftY: 0 },
    		owerlay: { left: 122, top: 19 },
    		owerlayMicrophone: { left: 78, top: 20 },
    		owerlayVolumeOn: { left: 25, top: 19 }
    	};

    	function keydown(event) {
    		if (gui.mainWindowOpen == false && event.key == "Insert") {
    			openMainWindow();
    		} else if (gui.mainWindowOpen == true && (event.key == "Escape" || event.key == "Insert")) {
    			closeMainWindow();
    		}
    	}

    	

    	function closeMainWindow() {
    		$$invalidate(2, gui.mainWindowOpen = false, gui);
    		$$invalidate(2, gui.deviceSelectOpen = false, gui);
    		$$invalidate(2, gui.roomSelectOpen = false, gui);
    		$$invalidate(2, gui.channelSelectOpen = false, gui);
    		$$invalidate(2, gui.mutList = false, gui);
    		$$invalidate(2, gui.volumeMainWindow = false, gui);
    	}

    	

    	function openMainWindow() {
    		$$invalidate(2, gui.mainWindowOpen = true, gui);
    	}

    	

    	function handlerDrag(event) {
    		if (event.which == 1) {
    			$$invalidate(3, move.nowMove = event.target.id, move);
    			let id = event.target.id;

    			if (id == "owerlayMicrophone" || id == "owerlayVolumeOn" || id == "owerlay") {
    				$$invalidate(3, move.elem.shiftX = event.clientX - event.target.getBoundingClientRect().left, move);
    				$$invalidate(3, move.elem.shiftY = event.clientY - event.target.getBoundingClientRect().top, move);
    				$$invalidate(3, move.ismove = true, move);
    			}
    		}
    	}

    	function onMouseMove(event) {
    		if (move.ismove) {
    			console.log(move.nowMove);

    			switch (move.nowMove) {
    				case "owerlay":
    					{
    						$$invalidate(3, move.owerlay.left = event.pageX - move.elem.shiftX, move);
    						$$invalidate(3, move.owerlay.top = event.pageY - move.elem.shiftY, move);
    						break;
    					}
    					
    				case "owerlayVolumeOn":
    					{
    						$$invalidate(3, move.owerlayVolumeOn.left = event.pageX - move.elem.shiftX, move);
    						$$invalidate(3, move.owerlayVolumeOn.top = event.pageY - move.elem.shiftY, move);

    						$$invalidate(
    							3,
    							move.owerlayVolumeOn.ondragstart = function () {
    								return false;
    							},
    							move
    						);

    						break;
    					}
    					
    				case "owerlayMicrophone":
    					{
    						$$invalidate(3, move.owerlayMicrophone.left = event.pageX - move.elem.shiftX, move);
    						$$invalidate(3, move.owerlayMicrophone.top = event.pageY - move.elem.shiftY, move);

    						$$invalidate(
    							3,
    							move.owerlayMicrophone.ondragstart = function () {
    								return false;
    							},
    							move
    						);

    						break;
    					}
    					
    			}
    		}
    	}

    	const $$binding_groups = [[], [], [], []];
    	const mousemove_handler = event => onMouseMove(event);
    	const mousedown_handler = event => handlerDrag(event);

    	const mouseup_handler = () => {
    		$$invalidate(3, move.ismove = false, move);
    	};

    	function input_change_handler() {
    		config.selectDevice = this.__value;
    		$$invalidate(0, config);
    	}

    	const click_handler = () => $$invalidate(2, gui.deviceSelectOpen = false, gui);
    	const click_handler_1 = () => $$invalidate(2, gui.mutList = false, gui);

    	function input_change_handler_1() {
    		config.selectRoom = this.__value;
    		$$invalidate(0, config);
    	}

    	const click_handler_2 = () => $$invalidate(2, gui.roomSelectOpen = false, gui);

    	function input_change_handler_2() {
    		config.selectchannel = this.__value;
    		$$invalidate(0, config);
    	}

    	const click_handler_3 = () => $$invalidate(2, gui.channelSelectOpen = false, gui);

    	function input_change_input_handler(value, each_value_1, each_index) {
    		each_value_1[each_index].value = to_number(this.value);
    		$$invalidate(1, volumeWindowPlayer);
    	}

    	function input0_change_input_handler() {
    		config.main.soundVolume = to_number(this.value);
    		$$invalidate(0, config);
    	}

    	function input1_change_input_handler() {
    		config.main.microphoneVolume = to_number(this.value);
    		$$invalidate(0, config);
    	}

    	const click_handler_4 = () => $$invalidate(2, gui.deviceSelectOpen = true, gui);
    	const click_handler_5 = () => $$invalidate(2, gui.mutList = true, gui);
    	const click_handler_6 = () => $$invalidate(2, gui.volumeMainWindow = true, gui);

    	function input2_change_handler() {
    		config.main.triggerOnOffSound = this.checked;
    		$$invalidate(0, config);
    	}

    	function input3_change_handler() {
    		config.main.triggerSound3D = this.checked;
    		$$invalidate(0, config);
    	}

    	function input4_change_handler() {
    		config.main.inputmode = this.checked;
    		$$invalidate(0, config);
    	}

    	function input0_change_handler() {
    		config.main.inputModeRadio = this.__value;
    		$$invalidate(0, config);
    	}

    	function input1_change_handler() {
    		config.main.inputModeRadio = this.__value;
    		$$invalidate(0, config);
    	}

    	function input2_change_handler_1() {
    		config.main.inputModeRadio = this.__value;
    		$$invalidate(0, config);
    	}

    	const click_handler_7 = () => $$invalidate(2, gui.roomSelectOpen = true, gui);
    	const click_handler_8 = () => $$invalidate(2, gui.channelSelectOpen = true, gui);

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		
    	};

    	return [
    		config,
    		volumeWindowPlayer,
    		gui,
    		move,
    		mutList,
    		volumeWindowRoom,
    		keydown,
    		closeMainWindow,
    		handlerDrag,
    		onMouseMove,
    		openMainWindow,
    		mousemove_handler,
    		mousedown_handler,
    		mouseup_handler,
    		input_change_handler,
    		$$binding_groups,
    		click_handler,
    		click_handler_1,
    		input_change_handler_1,
    		click_handler_2,
    		input_change_handler_2,
    		click_handler_3,
    		input_change_input_handler,
    		input0_change_input_handler,
    		input1_change_input_handler,
    		click_handler_4,
    		click_handler_5,
    		click_handler_6,
    		input2_change_handler,
    		input3_change_handler,
    		input4_change_handler,
    		input0_change_handler,
    		input1_change_handler,
    		input2_change_handler_1,
    		click_handler_7,
    		click_handler_8
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {}, [-1, -1]);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    var app = new App({
    	target: document.body
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
