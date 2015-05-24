/*
 * jQuery validation plug-in 1.7
 *
 * http://bassistance.de/jquery-plugins/jquery-plugin-validation/
 * http://docs.jquery.com/Plugins/Validation
 *
 * Copyright (c) 2006 - 2008 Jörn Zaefferer
 *
 * $Id: jquery.validate.js 6403 2009-06-17 14:27:16Z joern.zaefferer $
 *
 * Dual licensed under the MIT and GPL licenses:
 *   http://www.opensource.org/licenses/mit-license.php
 *   http://www.gnu.org/licenses/gpl.html
 */

(function($) {

$.extend($.fn, {
	// http://docs.jquery.com/Plugins/Validation/validate
	validate: function( options ) {

		// if nothing is selected, return nothing; can't chain anyway
		if (!this.length) {
			options && options.debug && window.console && console.warn( "nothing selected, can't validate, returning nothing" );
			return;
		}

		// check if a validator for this form was already created
		var validator = $.data(this[0], 'validator');
		if ( validator ) {
			return validator;
		}

		validator = new $.validator( options, this[0] );
		$.data(this[0], 'validator', validator);

		if ( validator.settings.onsubmit ) {

			// allow suppresing validation by adding a cancel class to the submit button
			this.find("input, button").filter(".cancel").click(function() {
				validator.cancelSubmit = true;
			});

			// when a submitHandler is used, capture the submitting button
			if (validator.settings.submitHandler) {
				this.find("input, button").filter(":submit").click(function() {
					validator.submitButton = this;
				});
			}

			// validate the form on submit
			this.submit( function( event ) {
				if ( validator.settings.debug )
					// prevent form submit to be able to see console output
					event.preventDefault();

				function handle() {
					if ( validator.settings.submitHandler ) {
						if (validator.submitButton) {
							// insert a hidden input as a replacement for the missing submit button
							var hidden = $("<input type='hidden'/>").attr("name", validator.submitButton.name).val(validator.submitButton.value).appendTo(validator.currentForm);
						}
						validator.settings.submitHandler.call( validator, validator.currentForm );
						if (validator.submitButton) {
							// and clean up afterwards; thanks to no-block-scope, hidden can be referenced
							hidden.remove();
						}
						return false;
					}
					return true;
				}

				// prevent submit for invalid forms or custom submit handlers
				if ( validator.cancelSubmit ) {
					validator.cancelSubmit = false;
					return handle();
				}
				if ( validator.form() ) {
					if ( validator.pendingRequest ) {
						validator.formSubmitted = true;
						return false;
					}
					return handle();
				} else {
					validator.focusInvalid();
					return false;
				}
			});
		}

		return validator;
	},
	// http://docs.jquery.com/Plugins/Validation/valid
	valid: function() {
        if ( $(this[0]).is('form')) {
            return this.validate().form();
        } else {
            var valid = true;
            var validator = $(this[0].form).validate();
            this.each(function() {
				valid &= validator.element(this);
            });
            return valid;
        }
    },
	// attributes: space seperated list of attributes to retrieve and remove
	removeAttrs: function(attributes) {
		var result = {},
			$element = this;
		$.each(attributes.split(/\s/), function(index, value) {
			result[value] = $element.attr(value);
			$element.removeAttr(value);
		});
		return result;
	},
	// http://docs.jquery.com/Plugins/Validation/rules
	rules: function(command, argument) {
		var element = this[0];

		if (command) {
			var settings = $.data(element.form, 'validator').settings;
			var staticRules = settings.rules;
			var existingRules = $.validator.staticRules(element);
			switch(command) {
			case "add":
				$.extend(existingRules, $.validator.normalizeRule(argument));
				staticRules[element.name] = existingRules;
				if (argument.messages)
					settings.messages[element.name] = $.extend( settings.messages[element.name], argument.messages );
				break;
			case "remove":
				if (!argument) {
					delete staticRules[element.name];
					return existingRules;
				}
				var filtered = {};
				$.each(argument.split(/\s/), function(index, method) {
					filtered[method] = existingRules[method];
					delete existingRules[method];
				});
				return filtered;
			}
		}

		var data = $.validator.normalizeRules(
		$.extend(
			{},
			$.validator.metadataRules(element),
			$.validator.classRules(element),
			$.validator.attributeRules(element),
			$.validator.staticRules(element)
		), element);

		// make sure required is at front
		if (data.required) {
			var param = data.required;
			delete data.required;
			data = $.extend({required: param}, data);
		}

		return data;
	}
});

// Custom selectors
$.extend($.expr[":"], {
	// http://docs.jquery.com/Plugins/Validation/blank
	blank: function(a) {return !$.trim("" + a.value);},
	// http://docs.jquery.com/Plugins/Validation/filled
	filled: function(a) {return !!$.trim("" + a.value);},
	// http://docs.jquery.com/Plugins/Validation/unchecked
	unchecked: function(a) {return !a.checked;}
});

// constructor for validator
$.validator = function( options, form ) {
	this.settings = $.extend( true, {}, $.validator.defaults, options );
	this.currentForm = form;
	this.init();
};

$.validator.format = function(source, params) {
	if ( arguments.length == 1 )
		return function() {
			var args = $.makeArray(arguments);
			args.unshift(source);
			return $.validator.format.apply( this, args );
		};
	if ( arguments.length > 2 && params.constructor != Array  ) {
		params = $.makeArray(arguments).slice(1);
	}
	if ( params.constructor != Array ) {
		params = [ params ];
	}
	$.each(params, function(i, n) {
		source = source.replace(new RegExp("\\{" + i + "\\}", "g"), n);
	});
	return source;
};

$.extend($.validator, {

	defaults: {
		messages: {},
		groups: {},
		rules: {},
		errorClass: "error",
		validClass: "valid",
		errorElement: "label",
		focusInvalid: true,
		errorContainer: $( [] ),
		errorLabelContainer: $( [] ),
		onsubmit: true,
		ignore: [],
		ignoreTitle: false,
		onfocusin: function(element) {
			this.lastActive = element;

			// hide error label and remove error class on focus if enabled
			if ( this.settings.focusCleanup && !this.blockFocusCleanup ) {
				this.settings.unhighlight && this.settings.unhighlight.call( this, element, this.settings.errorClass, this.settings.validClass );
				this.errorsFor(element).hide();
			}
		},
		onfocusout: function(element) {
			if ( !this.checkable(element) && (element.name in this.submitted || !this.optional(element)) ) {
				this.element(element);
			}
		},
		onkeyup: function(element) {
			if ( element.name in this.submitted || element == this.lastElement ) {
				this.element(element);
			}
		},
		onclick: function(element) {
			// click on selects, radiobuttons and checkboxes
			if ( element.name in this.submitted )
				this.element(element);
			// or option elements, check parent select in that case
			else if (element.parentNode.name in this.submitted)
				this.element(element.parentNode);
		},
		highlight: function( element, errorClass, validClass ) {
			$(element).addClass(errorClass).removeClass(validClass);
		},
		unhighlight: function( element, errorClass, validClass ) {
			$(element).removeClass(errorClass).addClass(validClass);
		}
	},

	// http://docs.jquery.com/Plugins/Validation/Validator/setDefaults
	setDefaults: function(settings) {
		$.extend( $.validator.defaults, settings );
	},

	messages: {
		required: "不能为空.",
		remote: "Please fix this field.",
		email: "请输入正确的邮件地址.",
		url: "请输入正确的URL地址，如http://www.helloweba.com",
		date: "Please enter a valid date.",
		dateISO: "格式错误!",
		number: "请填写合适的数字.",
		digits: "只能输入数字.",
		creditcard: "Please enter a valid credit card number.",
		equalTo: "两次密码输入不一致.",
		accept: "文件格式不对！",
		maxlength: $.validator.format("您输入的字符数不能大于 {0} 位."),
		minlength: $.validator.format("您输入的字符数不能小于 {0} 位."),
		rangelength: $.validator.format("Please enter a value between {0} and {1} characters long."),
		range: $.validator.format("您输入的值的范围应该在 {0} 和 {1} 之间."),
		max: $.validator.format("Please enter a value less than or equal to {0}."),
		min: $.validator.format("Please enter a value greater than or equal to {0}.")
	},

	autoCreateRanges: false,

	prototype: {

		init: function() {
			this.labelContainer = $(this.settings.errorLabelContainer);
			this.errorContext = this.labelContainer.length && this.labelContainer || $(this.currentForm);
			this.containers = $(this.settings.errorContainer).add( this.settings.errorLabelContainer );
			this.submitted = {};
			this.valueCache = {};
			this.pendingRequest = 0;
			this.pending = {};
			this.invalid = {};
			this.reset();

			var groups = (this.groups = {});
			$.each(this.settings.groups, function(key, value) {
				$.each(value.split(/\s/), function(index, name) {
					groups[name] = key;
				});
			});
			var rules = this.settings.rules;
			$.each(rules, function(key, value) {
				rules[key] = $.validator.normalizeRule(value);
			});

			function delegate(event) {
				var validator = $.data(this[0].form, "validator"),
					eventType = "on" + event.type.replace(/^validate/, "");
				validator.settings[eventType] && validator.settings[eventType].call(validator, this[0] );
			}
			$(this.currentForm)
				.validateDelegate(":text, :password, :file, select, textarea", "focusin focusout keyup", delegate)
				.validateDelegate(":radio, :checkbox, select, option", "click", delegate);

			if (this.settings.invalidHandler)
				$(this.currentForm).bind("invalid-form.validate", this.settings.invalidHandler);
		},

		// http://docs.jquery.com/Plugins/Validation/Validator/form
		form: function() {
			this.checkForm();
			$.extend(this.submitted, this.errorMap);
			this.invalid = $.extend({}, this.errorMap);
			if (!this.valid())
				$(this.currentForm).triggerHandler("invalid-form", [this]);
			this.showErrors();
			return this.valid();
		},

		checkForm: function() {
			this.prepareForm();
			for ( var i = 0, elements = (this.currentElements = this.elements()); elements[i]; i++ ) {
				this.check( elements[i] );
			}
			return this.valid();
		},

		// http://docs.jquery.com/Plugins/Validation/Validator/element
		element: function( element ) {
			element = this.clean( element );
			this.lastElement = element;
			this.prepareElement( element );
			this.currentElements = $(element);
			var result = this.check( element );
			if ( result ) {
				delete this.invalid[element.name];
			} else {
				this.invalid[element.name] = true;
			}
			if ( !this.numberOfInvalids() ) {
				// Hide error containers on last error
				this.toHide = this.toHide.add( this.containers );
			}
			this.showErrors();
			return result;
		},

		// http://docs.jquery.com/Plugins/Validation/Validator/showErrors
		showErrors: function(errors) {
			if(errors) {
				// add items to error list and map
				$.extend( this.errorMap, errors );
				this.errorList = [];
				for ( var name in errors ) {
					this.errorList.push({
						message: errors[name],
						element: this.findByName(name)[0]
					});
				}
				// remove items from success list
				this.successList = $.grep( this.successList, function(element) {
					return !(element.name in errors);
				});
			}
			this.settings.showErrors
				? this.settings.showErrors.call( this, this.errorMap, this.errorList )
				: this.defaultShowErrors();
		},

		// http://docs.jquery.com/Plugins/Validation/Validator/resetForm
		resetForm: function() {
			if ( $.fn.resetForm )
				$( this.currentForm ).resetForm();
			this.submitted = {};
			this.prepareForm();
			this.hideErrors();
			this.elements().removeClass( this.settings.errorClass );
		},

		numberOfInvalids: function() {
			return this.objectLength(this.invalid);
		},

		objectLength: function( obj ) {
			var count = 0;
			for ( var i in obj )
				count++;
			return count;
		},

		hideErrors: function() {
			this.addWrapper( this.toHide ).hide();
		},

		valid: function() {
			return this.size() == 0;
		},

		size: function() {
			return this.errorList.length;
		},

		focusInvalid: function() {
			if( this.settings.focusInvalid ) {
				try {
					$(this.findLastActive() || this.errorList.length && this.errorList[0].element || [])
					.filter(":visible")
					.focus()
					// manually trigger focusin event; without it, focusin handler isn't called, findLastActive won't have anything to find
					.trigger("focusin");
				} catch(e) {
					// ignore IE throwing errors when focusing hidden elements
				}
			}
		},

		findLastActive: function() {
			var lastActive = this.lastActive;
			return lastActive && $.grep(this.errorList, function(n) {
				return n.element.name == lastActive.name;
			}).length == 1 && lastActive;
		},

		elements: function() {
			var validator = this,
				rulesCache = {};

			// select all valid inputs inside the form (no submit or reset buttons)
			// workaround $Query([]).add until http://dev.jquery.com/ticket/2114 is solved
			return $([]).add(this.currentForm.elements)
			.filter(":input")
			.not(":submit, :reset, :image, [disabled]")
			.not( this.settings.ignore )
			.filter(function() {
				!this.name && validator.settings.debug && window.console && console.error( "%o has no name assigned", this);

				// select only the first element for each name, and only those with rules specified
				if ( this.name in rulesCache || !validator.objectLength($(this).rules()) )
					return false;

				rulesCache[this.name] = true;
				return true;
			});
		},

		clean: function( selector ) {
			return $( selector )[0];
		},

		errors: function() {
			return $( this.settings.errorElement + "." + this.settings.errorClass, this.errorContext );
		},

		reset: function() {
			this.successList = [];
			this.errorList = [];
			this.errorMap = {};
			this.toShow = $([]);
			this.toHide = $([]);
			this.currentElements = $([]);
		},

		prepareForm: function() {
			this.reset();
			this.toHide = this.errors().add( this.containers );
		},

		prepareElement: function( element ) {
			this.reset();
			this.toHide = this.errorsFor(element);
		},

		check: function( element ) {
			element = this.clean( element );

			// if radio/checkbox, validate first element in group instead
			if (this.checkable(element)) {
				element = this.findByName( element.name )[0];
			}

			var rules = $(element).rules();
			var dependencyMismatch = false;
			for( method in rules ) {
				var rule = { method: method, parameters: rules[method] };
				try {
					var result = $.validator.methods[method].call( this, element.value.replace(/\r/g, ""), element, rule.parameters );

					// if a method indicates that the field is optional and therefore valid,
					// don't mark it as valid when there are no other rules
					if ( result == "dependency-mismatch" ) {
						dependencyMismatch = true;
						continue;
					}
					dependencyMismatch = false;

					if ( result == "pending" ) {
						this.toHide = this.toHide.not( this.errorsFor(element) );
						return;
					}

					if( !result ) {
						this.formatAndAdd( element, rule );
						return false;
					}
				} catch(e) {
					this.settings.debug && window.console && console.log("exception occured when checking element " + element.id
						 + ", check the '" + rule.method + "' method", e);
					throw e;
				}
			}
			if (dependencyMismatch)
				return;
			if ( this.objectLength(rules) )
				this.successList.push(element);
			return true;
		},

		// return the custom message for the given element and validation method
		// specified in the element's "messages" metadata
		customMetaMessage: function(element, method) {
			if (!$.metadata)
				return;

			var meta = this.settings.meta
				? $(element).metadata()[this.settings.meta]
				: $(element).metadata();

			return meta && meta.messages && meta.messages[method];
		},

		// return the custom message for the given element name and validation method
		customMessage: function( name, method ) {
			var m = this.settings.messages[name];
			return m && (m.constructor == String
				? m
				: m[method]);
		},

		// return the first defined argument, allowing empty strings
		findDefined: function() {
			for(var i = 0; i < arguments.length; i++) {
				if (arguments[i] !== undefined)
					return arguments[i];
			}
			return undefined;
		},

		defaultMessage: function( element, method) {
			return this.findDefined(
				this.customMessage( element.name, method ),
				this.customMetaMessage( element, method ),
				// title is never undefined, so handle empty string as undefined
				!this.settings.ignoreTitle && element.title || undefined,
				$.validator.messages[method],
				"<strong>Warning: No message defined for " + element.name + "</strong>"
			);
		},

		formatAndAdd: function( element, rule ) {
			var message = this.defaultMessage( element, rule.method ),
				theregex = /\$?\{(\d+)\}/g;
			if ( typeof message == "function" ) {
				message = message.call(this, rule.parameters, element);
			} else if (theregex.test(message)) {
				message = jQuery.format(message.replace(theregex, '{$1}'), rule.parameters);
			}
			this.errorList.push({
				message: message,
				element: element
			});

			this.errorMap[element.name] = message;
			this.submitted[element.name] = message;
		},

		addWrapper: function(toToggle) {
			if ( this.settings.wrapper )
				toToggle = toToggle.add( toToggle.parent( this.settings.wrapper ) );
			return toToggle;
		},

		defaultShowErrors: function() {
			for ( var i = 0; this.errorList[i]; i++ ) {
				var error = this.errorList[i];
				this.settings.highlight && this.settings.highlight.call( this, error.element, this.settings.errorClass, this.settings.validClass );
				this.showLabel( error.element, error.message );
			}
			if( this.errorList.length ) {
				this.toShow = this.toShow.add( this.containers );
			}
			if (this.settings.success) {
				for ( var i = 0; this.successList[i]; i++ ) {
					this.showLabel( this.successList[i] );
				}
			}
			if (this.settings.unhighlight) {
				for ( var i = 0, elements = this.validElements(); elements[i]; i++ ) {
					this.settings.unhighlight.call( this, elements[i], this.settings.errorClass, this.settings.validClass );
				}
			}
			this.toHide = this.toHide.not( this.toShow );
			this.hideErrors();
			this.addWrapper( this.toShow ).show();
		},

		validElements: function() {
			return this.currentElements.not(this.invalidElements());
		},

		invalidElements: function() {
			return $(this.errorList).map(function() {
				return this.element;
			});
		},

		showLabel: function(element, message) {
			var label = this.errorsFor( element );
			if ( label.length ) {
				// refresh error/success class
				label.removeClass().addClass( this.settings.errorClass );

				// check if we have a generated label, replace the message then
				label.attr("generated") && label.html(message);
			} else {
				// create label
				label = $("<" + this.settings.errorElement + "/>")
					.attr({"for":  this.idOrName(element), generated: true})
					.addClass(this.settings.errorClass)
					.html(message || "");
				if ( this.settings.wrapper ) {
					// make sure the element is visible, even in IE
					// actually showing the wrapped element is handled elsewhere
					label = label.hide().show().wrap("<" + this.settings.wrapper + "/>").parent();
				}
				if ( !this.labelContainer.append(label).length )
					this.settings.errorPlacement
						? this.settings.errorPlacement(label, $(element) )
						: label.insertAfter(element);
			}
			if ( !message && this.settings.success ) {
				label.text("");
				typeof this.settings.success == "string"
					? label.addClass( this.settings.success )
					: this.settings.success( label );
			}
			this.toShow = this.toShow.add(label);
		},

		errorsFor: function(element) {
			var name = this.idOrName(element);
    		return this.errors().filter(function() {
				return $(this).attr('for') == name;
			});
		},

		idOrName: function(element) {
			return this.groups[element.name] || (this.checkable(element) ? element.name : element.id || element.name);
		},

		checkable: function( element ) {
			return /radio|checkbox/i.test(element.type);
		},

		findByName: function( name ) {
			// select by name and filter by form for performance over form.find("[name=...]")
			var form = this.currentForm;
			return $(document.getElementsByName(name)).map(function(index, element) {
				return element.form == form && element.name == name && element  || null;
			});
		},

		getLength: function(value, element) {
			switch( element.nodeName.toLowerCase() ) {
			case 'select':
				return $("option:selected", element).length;
			case 'input':
				if( this.checkable( element) )
					return this.findByName(element.name).filter(':checked').length;
			}
			return value.length;
		},

		depend: function(param, element) {
			return this.dependTypes[typeof param]
				? this.dependTypes[typeof param](param, element)
				: true;
		},

		dependTypes: {
			"boolean": function(param, element) {
				return param;
			},
			"string": function(param, element) {
				return !!$(param, element.form).length;
			},
			"function": function(param, element) {
				return param(element);
			}
		},

		optional: function(element) {
			return !$.validator.methods.required.call(this, $.trim(element.value), element) && "dependency-mismatch";
		},

		startRequest: function(element) {
			if (!this.pending[element.name]) {
				this.pendingRequest++;
				this.pending[element.name] = true;
			}
		},

		stopRequest: function(element, valid) {
			this.pendingRequest--;
			// sometimes synchronization fails, make sure pendingRequest is never < 0
			if (this.pendingRequest < 0)
				this.pendingRequest = 0;
			delete this.pending[element.name];
			if ( valid && this.pendingRequest == 0 && this.formSubmitted && this.form() ) {
				$(this.currentForm).submit();
				this.formSubmitted = false;
			} else if (!valid && this.pendingRequest == 0 && this.formSubmitted) {
				$(this.currentForm).triggerHandler("invalid-form", [this]);
				this.formSubmitted = false;
			}
		},

		previousValue: function(element) {
			return $.data(element, "previousValue") || $.data(element, "previousValue", {
				old: null,
				valid: true,
				message: this.defaultMessage( element, "remote" )
			});
		}

	},

	classRuleSettings: {
		required: {required: true},
		email: {email: true},
		url: {url: true},
		date: {date: true},
		dateISO: {dateISO: true},
		dateDE: {dateDE: true},
		number: {number: true},
		numberDE: {numberDE: true},
		digits: {digits: true},
		creditcard: {creditcard: true}
	},

	addClassRules: function(className, rules) {
		className.constructor == String ?
			this.classRuleSettings[className] = rules :
			$.extend(this.classRuleSettings, className);
	},

	classRules: function(element) {
		var rules = {};
		var classes = $(element).attr('class');
		classes && $.each(classes.split(' '), function() {
			if (this in $.validator.classRuleSettings) {
				$.extend(rules, $.validator.classRuleSettings[this]);
			}
		});
		return rules;
	},

	attributeRules: function(element) {
		var rules = {};
		var $element = $(element);

		for (method in $.validator.methods) {
			var value = $element.attr(method);
			if (value) {
				rules[method] = value;
			}
		}

		// maxlength may be returned as -1, 2147483647 (IE) and 524288 (safari) for text inputs
		if (rules.maxlength && /-1|2147483647|524288/.test(rules.maxlength)) {
			delete rules.maxlength;
		}

		return rules;
	},

	metadataRules: function(element) {
		if (!$.metadata) return {};

		var meta = $.data(element.form, 'validator').settings.meta;
		return meta ?
			$(element).metadata()[meta] :
			$(element).metadata();
	},

	staticRules: function(element) {
		var rules = {};
		var validator = $.data(element.form, 'validator');
		if (validator.settings.rules) {
			rules = $.validator.normalizeRule(validator.settings.rules[element.name]) || {};
		}
		return rules;
	},

	normalizeRules: function(rules, element) {
		// handle dependency check
		$.each(rules, function(prop, val) {
			// ignore rule when param is explicitly false, eg. required:false
			if (val === false) {
				delete rules[prop];
				return;
			}
			if (val.param || val.depends) {
				var keepRule = true;
				switch (typeof val.depends) {
					case "string":
						keepRule = !!$(val.depends, element.form).length;
						break;
					case "function":
						keepRule = val.depends.call(element, element);
						break;
				}
				if (keepRule) {
					rules[prop] = val.param !== undefined ? val.param : true;
				} else {
					delete rules[prop];
				}
			}
		});

		// evaluate parameters
		$.each(rules, function(rule, parameter) {
			rules[rule] = $.isFunction(parameter) ? parameter(element) : parameter;
		});

		// clean number parameters
		$.each(['minlength', 'maxlength', 'min', 'max'], function() {
			if (rules[this]) {
				rules[this] = Number(rules[this]);
			}
		});
		$.each(['rangelength', 'range'], function() {
			if (rules[this]) {
				rules[this] = [Number(rules[this][0]), Number(rules[this][1])];
			}
		});

		if ($.validator.autoCreateRanges) {
			// auto-create ranges
			if (rules.min && rules.max) {
				rules.range = [rules.min, rules.max];
				delete rules.min;
				delete rules.max;
			}
			if (rules.minlength && rules.maxlength) {
				rules.rangelength = [rules.minlength, rules.maxlength];
				delete rules.minlength;
				delete rules.maxlength;
			}
		}

		// To support custom messages in metadata ignore rule methods titled "messages"
		if (rules.messages) {
			delete rules.messages;
		}

		return rules;
	},

	// Converts a simple string to a {string: true} rule, e.g., "required" to {required:true}
	normalizeRule: function(data) {
		if( typeof data == "string" ) {
			var transformed = {};
			$.each(data.split(/\s/), function() {
				transformed[this] = true;
			});
			data = transformed;
		}
		return data;
	},

	// http://docs.jquery.com/Plugins/Validation/Validator/addMethod
	addMethod: function(name, method, message) {
		$.validator.methods[name] = method;
		$.validator.messages[name] = message != undefined ? message : $.validator.messages[name];
		if (method.length < 3) {
			$.validator.addClassRules(name, $.validator.normalizeRule(name));
		}
	},

	methods: {

		// http://docs.jquery.com/Plugins/Validation/Methods/required
		required: function(value, element, param) {
			// check if dependency is met
			if ( !this.depend(param, element) )
				return "dependency-mismatch";
			switch( element.nodeName.toLowerCase() ) {
			case 'select':
				// could be an array for select-multiple or a string, both are fine this way
				var val = $(element).val();
				return val && val.length > 0;
			case 'input':
				if ( this.checkable(element) )
					return this.getLength(value, element) > 0;
			default:
				return $.trim(value).length > 0;
			}
		},

		// http://docs.jquery.com/Plugins/Validation/Methods/remote
		remote: function(value, element, param) {
			if ( this.optional(element) )
				return "dependency-mismatch";

			var previous = this.previousValue(element);
			if (!this.settings.messages[element.name] )
				this.settings.messages[element.name] = {};
			previous.originalMessage = this.settings.messages[element.name].remote;
			this.settings.messages[element.name].remote = previous.message;

			param = typeof param == "string" && {url:param} || param;

			if ( previous.old !== value ) {
				previous.old = value;
				var validator = this;
				this.startRequest(element);
				var data = {};
				data[element.name] = value;
				$.ajax($.extend(true, {
					url: param,
					//url: param.url,
					mode: "abort",
					port: "validate" + element.name,
					dataType: "json",
					data: data,
					//data: param.data || data,
					success: function(response) {
						validator.settings.messages[element.name].remote = previous.originalMessage;
						var valid = response === true;
						if ( valid ) {
							var submitted = validator.formSubmitted;
							validator.prepareElement(element);
							validator.formSubmitted = submitted;
							validator.successList.push(element);
							validator.showErrors();
						} else {
							var errors = {};
							var message = (previous.message = response || validator.defaultMessage( element, "remote" ));
							errors[element.name] = $.isFunction(message) ? message(value) : message;
							validator.showErrors(errors);
						}
						previous.valid = valid;
						validator.stopRequest(element, valid);
					}
				}, param));
				return "pending";
			} else if( this.pending[element.name] ) {
				return "pending";
			}
			return previous.valid;
		},

		// http://docs.jquery.com/Plugins/Validation/Methods/minlength
		minlength: function(value, element, param) {
			return this.optional(element) || this.getLength($.trim(value), element) >= param;
		},

		// http://docs.jquery.com/Plugins/Validation/Methods/maxlength
		maxlength: function(value, element, param) {
			return this.optional(element) || this.getLength($.trim(value), element) <= param;
		},

		// http://docs.jquery.com/Plugins/Validation/Methods/rangelength
		rangelength: function(value, element, param) {
			var length = this.getLength($.trim(value), element);
			return this.optional(element) || ( length >= param[0] && length <= param[1] );
		},

		// http://docs.jquery.com/Plugins/Validation/Methods/min
		min: function( value, element, param ) {
			return this.optional(element) || value >= param;
		},

		// http://docs.jquery.com/Plugins/Validation/Methods/max
		max: function( value, element, param ) {
			return this.optional(element) || value <= param;
		},

		// http://docs.jquery.com/Plugins/Validation/Methods/range
		range: function( value, element, param ) {
			return this.optional(element) || ( value >= param[0] && value <= param[1] );
		},

		// http://docs.jquery.com/Plugins/Validation/Methods/email
		email: function(value, element) {
			// contributed by Scott Gonzalez: http://projects.scottsplayground.com/email_address_validation/
			return this.optional(element) || /^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?$/i.test(value);
		},

		// 验证身份证
		//dateISO: function(value, element) {
		//	return this.optional(element) || /^\d{4}[\/-]\d{1,2}[\/-]\d{1,2}$/.test(value);
		//},

		// http://docs.jquery.com/Plugins/Validation/Methods/url
		url: function(value, element) {
			// contributed by Scott Gonzalez: http://projects.scottsplayground.com/iri/
			return this.optional(element) || /^(https?|ftp):\/\/(((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)*@)?(((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5]))|((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?)(:\d*)?)(\/((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)?)?(\?((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|[\uE000-\uF8FF]|\/|\?)*)?(\#((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|\/|\?)*)?$/i.test(value);
		},

		// http://docs.jquery.com/Plugins/Validation/Methods/date
		date: function(value, element) {
			return this.optional(element) || !/Invalid|NaN/.test(new Date(value));
		},

		// http://docs.jquery.com/Plugins/Validation/Methods/dateISO
		dateISO: function(value, element) {
			return this.optional(element) || /^\d{4}[\/-]\d{1,2}[\/-]\d{1,2}$/.test(value);
		},

		// http://docs.jquery.com/Plugins/Validation/Methods/number
		number: function(value, element) {
			return this.optional(element) || /^-?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/.test(value);
		},

		// http://docs.jquery.com/Plugins/Validation/Methods/digits
		digits: function(value, element) {
			return this.optional(element) || /^\d+$/.test(value);
		},

		// http://docs.jquery.com/Plugins/Validation/Methods/creditcard
		// based on http://en.wikipedia.org/wiki/Luhn
		creditcard: function(value, element) {
			if ( this.optional(element) )
				return "dependency-mismatch";
			// accept only digits and dashes
			if (/[^0-9-]+/.test(value))
				return false;
			var nCheck = 0,
				nDigit = 0,
				bEven = false;

			value = value.replace(/\D/g, "");

			for (var n = value.length - 1; n >= 0; n--) {
				var cDigit = value.charAt(n);
				var nDigit = parseInt(cDigit, 10);
				if (bEven) {
					if ((nDigit *= 2) > 9)
						nDigit -= 9;
				}
				nCheck += nDigit;
				bEven = !bEven;
			}

			return (nCheck % 10) == 0;
		},

		// http://docs.jquery.com/Plugins/Validation/Methods/accept
		accept: function(value, element, param) {
			param = typeof param == "string" ? param.replace(/,/g, '|') : "png|jpe?g|gif";
			return this.optional(element) || value.match(new RegExp(".(" + param + ")$", "i"));
		},

		// http://docs.jquery.com/Plugins/Validation/Methods/equalTo
		equalTo: function(value, element, param) {
			// bind to the blur event of the target in order to revalidate whenever the target field is updated
			// TODO find a way to bind the event just once, avoiding the unbind-rebind overhead
			var target = $(param).unbind(".validate-equalTo").bind("blur.validate-equalTo", function() {
				$(element).valid();
			});
			return value == target.val();
		}

	}

});

// deprecated, use $.validator.format instead
$.format = $.validator.format;

})(jQuery);

// ajax mode: abort
// usage: $.ajax({ mode: "abort"[, port: "uniqueport"]});
// if mode:"abort" is used, the previous request on that port (port can be undefined) is aborted via XMLHttpRequest.abort()
;(function($) {
	var ajax = $.ajax;
	var pendingRequests = {};
	$.ajax = function(settings) {
		// create settings for compatibility with ajaxSetup
		settings = $.extend(settings, $.extend({}, $.ajaxSettings, settings));
		var port = settings.port;
		if (settings.mode == "abort") {
			if ( pendingRequests[port] ) {
				pendingRequests[port].abort();
			}
			return (pendingRequests[port] = ajax.apply(this, arguments));
		}
		return ajax.apply(this, arguments);
	};
})(jQuery);

// provides cross-browser focusin and focusout events
// IE has native support, in other browsers, use event caputuring (neither bubbles)

// provides delegate(type: String, delegate: Selector, handler: Callback) plugin for easier event delegation
// handler is only called when $(event.target).is(delegate), in the scope of the jquery-object for event.target
;(function($) {
	// only implement if not provided by jQuery core (since 1.4)
	// TODO verify if jQuery 1.4's implementation is compatible with older jQuery special-event APIs
	if (!jQuery.event.special.focusin && !jQuery.event.special.focusout && document.addEventListener) {
		$.each({
			focus: 'focusin',
			blur: 'focusout'
		}, function( original, fix ){
			$.event.special[fix] = {
				setup:function() {
					this.addEventListener( original, handler, true );
				},
				teardown:function() {
					this.removeEventListener( original, handler, true );
				},
				handler: function(e) {
					arguments[0] = $.event.fix(e);
					arguments[0].type = fix;
					return $.event.handle.apply(this, arguments);
				}
			};
			function handler(e) {
				e = $.event.fix(e);
				e.type = fix;
				return $.event.handle.call(this, e);
			}
		});
	};
	$.extend($.fn, {
		validateDelegate: function(delegate, type, handler) {
			return this.bind(type, function(event) {
				var target = $(event.target);
				if (target.is(delegate)) {
					return handler.apply(target, arguments);
				}
			});
		}
	});
})(jQuery);



jQuery.validator.addMethod("phone", function(value, element) {
    var mobileRule = /^(13[0-9]|14[5|7]|15[0|1|2|3|5|6|7|8|9]|18[0-9]|17[0-9])\d{8}$/;
	return this.optional(element) || (mobileRule.test(value))
}, "手机号格式错误！");


	$.fn.ckPassWord = function(s){   //密码强度检测 "stong"为检查强弱度

		var STRONG = '<div class="safety pwd-strong">'
		STRONG+='<span class="level-1" level="1">弱</span>'
		STRONG+='<span class="level-2" level="2">中</span>'
		STRONG+='<span class="level-3" level="3">强</span> </div>';
        $this = $(this);

        if(s == "strong"){
            $('.pwd-strong').remove();
            $this.after(STRONG);
            $this.bind("keyup",function(){
                var val	= $this.val().trim();
                pwdStrong.passwordLen(val);
                pwdStrong.genReport( $this, val );
            })
            $(this).bind('focusout',function(){
                var val	= $this.val().trim();
                pwdStrong. passwordSix(val)
            })
        } else if(arguments.length == 0) {
            $this.bind("keyup",function(){
                var val	= $this.val().trim();
                pwdStrong.passwordLen(val);

            })
            $(this).bind('focusout',function(){
                var val	= $this.val().trim();
                if(val != ''){
                    pwdStrong. passwordSix(val)
                }

            })
        }

	};

/* 密码强度检测 */
var pwdStrong	= {
    level:['', '太简单了', '一般般', '很安全'],
    main: function( jq_obj, val ) {
        if( val == '' )
        {
            return 0;
        }
        var jq_obj	= jq_obj;
        var strongRegex	= new RegExp("^(?=.{8,})(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*\\W).*$", "g");
        var mediumRegex	= new RegExp("^(?=.{7,})(((?=.*[A-Z])(?=.*[a-z]))|((?=.*[A-Z])(?=.*[0-9]))|((?=.*[a-z])(?=.*[0-9]))).*$", "g");
        var enoughRegex	= new RegExp("(?=.{6,}).*", "g");
        if ( false == enoughRegex.test(val) )
        {
            return 1;
        }
        else if (strongRegex.test(val))
        {
            return 3;
        }
        else if (mediumRegex.test(val))
        {
            return 2;
        }
        else
        {
            return 1;
        }
        return false;
    },
    genReport:function( jq_obj, val ) {
        if( typeof(jq_obj) && jq_obj )
        {
            var level_id	= pwdStrong.main( jq_obj, val );
            pwdStrong.handleReport( jq_obj, level_id );
            if( typeof( callBack ) == 'function' )
            {
                callBack( jq_obj, level_id );
            }
        }
    },
    passwordSix:function(value){
        len = value.length
        if(len < 6 && len>0){
            $this.next().next('.warning').remove();
            //$this.next().after("<span  class='warning wrong' cktype='false'>密码长度不小于6位</span>")
        }else{
            $this.next().next('.warning').remove();
        }
    },
    passwordLen:function(value,cla,txt){ //字符限制
        var realLength = 0, len = value.length, charCode = -1;
        if(arguments.length== 1){
            for (var i = 0; i < len; i++) {
                charCode = value.charCodeAt(i);

                if (charCode < 32 || charCode > 126){
                    $this.next().next('.warning').remove();
                    $this.next().after("<span  class='warning wrong' cktype='false'>只能包括英文字母、数字和下划线及半角标点符号</span>")
                }  else {
                    $this.next('.warning').remove();
                }
            }
        } else{
            for (var i = 0; i < len; i++) {
                charCode = value.charCodeAt(i);

                if (charCode < 32 || charCode > 126){
                    $(cla).html(txt)
                }  else {

                }
            }
        }



    },
    callBack: '',
    handleReport: function( jq_obj, level_id ) {
        switch (level_id){
            case 1:
                jq_obj.next('.pwd-strong').find('span').css("background",'#ddd');
                jq_obj.next('.pwd-strong').find('span').eq(0).css("background","#da4619");
                break;
            case 2:
                jq_obj.next('.pwd-strong').find('span').css("background",'#ddd');
                jq_obj.next('.pwd-strong').find('span:lt(2)').css("background","#ff5c00");
                break;
            case 3:
                jq_obj.next('.pwd-strong').find('span').css("background",'#35b558');
                break;
        }
//				jq_obj.next('.pwd-strong').find('span').each(function(){
//
//
////					if( $(this).attr('level') <= level_id )
////					{
////					    $(this).removeClass('active').addClass('active');
////
////					}
////					else
////					{
////						$(this).removeClass('active');
////					}
//				});

    }
};



var JK_lock = "open";
var domain = {
	domain : function(url){
		var durl=/http:\/\/([^\/]+)\//i;
		var hosts = url.match(durl);
		hosts = hosts[1];
		d_arr = hosts.split('.');
		hosts = d_arr[d_arr.length - 2] + '.' + d_arr[d_arr.length - 1];
		return hosts;
	},
	domain_pre : function(url){
		var durl=/http:\/\/([^\/]+)\//i;
		var hosts = url.match(durl);
		hosts = hosts[1];
		d_arr = hosts.split('.');
		return d_arr[0];
	},
	domain_arr :function(url){
		var durl=/http:\/\/([^\/]+)\//i;
		var hosts = url.match(durl);
		hosts = hosts[1];
		d_arr = hosts.split('.');
		return d_arr;
	}
};
var host_arr = domain.domain_arr(window.location.href);
var baseUrl = host_arr[1] + '.' + host_arr[2];
var webUrl= "http://passport." + baseUrl;
var wwwUrl = "http://www."  + baseUrl;
var safeCodeUrl = webUrl + "/sso/verify";
var webUrlFix = host_arr[1] + '.' + host_arr[2];
var cdn_url = "/";
var qq_login_url = webUrl + '/connect/qq', wx_login_url = webUrl + '/connect/weixin', weibo_login_url = webUrl + '/connect/weibo', eoe_login_url=webUrl + '/connect/eoe';

(function($) {
	var clicknumber = 0;
	var methods = {
		init: function(options) {},
		pop: function(options) { //弹出层
			var _H = $(window).height();
			var _W = $(window).width();
			var jumpstop = 0;
			var stop = 1;
			/*
			 * options.width(number)	弹出层宽度（必选）
			 * options.height(number) 弹出层高度（必选）
			 * options.zIndex(number) 弹出层index轴 ，默认为9999；（可选）
			 * options.poparent(jquery节点) 要插入的父节点,默认为‘body’（可选）
			 * options.opacity(0~1) 背景透明度（可选）
			 * option.popId(jqeury节点 ) 要插入的弹出层ID或者calss,最好为ID，强调唯一性！（必选）
			 * option.popHtml(插入弹出层元素结构) 如“<div id='test'></div>"；（可选）
			 * option.popFunc(function方法) 弹出层回调方法；（可选）
			 * option.closePop(function方法) 关闭回调方法；（可选）
			 * option.time(1~100000)//X秒跳转，X为整数，如：1为1秒（可选）
			 * option.timeId(id)//为一个ID节点，用来储存时间显示（可选）
			 * option.url(URL)//一个链接，倒计时跳转路径。（可选）
			 * 关闭按钮约定名称为 calss = popclose;（可选）
			 * */
			var settings = {
				'width': 100,
				'height': 100,
				'zIndex': 9999,
				'poparent': 'body',
				'opacity': 0.5,
				'popId': null,
				'popHtml': null,
				'popFunc': null,
				'time': null,
				'timeId': null,
				'url': null,
				'closePop': null
			};
			// 如果存在选项，则合并之
			if (options) {
				$.extend(settings, options);
			}
			var popTop;
			var popLeft = (_W - settings.width) / 2;
			if (settings.popHtml === null) {
				return this.each(function() {
					var $this = $(this);
					if (settings.height == 'auto') {
						settings.height = $this.height();
					};
					popTop = (_H - settings.height) / 2;
					$this.show();
					$this.css({
						width: settings.width,
						height: settings.height,
						zIndex: settings.zIndex,
						top: popTop,
						left: popLeft,
						position: 'fixed'
					});
					closebox();
					if (settings.time !== null) {
						jump(settings.time, settings.timeId, settings.url);
					}
				});
			} else if (settings.popHtml !== null) {
				$(settings.poparent).append(settings.popHtml);
				if (settings.height == 'auto') {
					settings.height = $(settings.popId).height();
				};
				popTop = (_H - settings.height) / 2;
				$(settings.popId).css({
					width: settings.width,
					height: settings.height,
					zIndex: settings.zIndex,
					top: popTop,
					left: popLeft,
					position: 'fixed'
				});
				closebox()
			};

			function closebox() {
				if (settings.popFunc !== null) {
					settings.popFunc()
				};
				var backlayer = "<div id='blacklayer'></div>"
				$("body").append(backlayer);
				var dh = $(document).height();

				$('#blacklayer').css({
					zIndex: settings.zIndex - 10,
					background: "#000",
					opacity: settings.opacity,
					position: 'absolute',
					left: 0,
					top: 0,
					width: '100%',
					height: dh
				})
				$('.popclose').bind("click", function() {
					stop = 0;
					$('#blacklayer').remove();
					if (settings.popHtml === null) {
						$(settings.popId).hide();
					} else {
						$(settings.popId).remove();
					}
					if (settings.closePop != null) {
						settings.closePop();
					}
				})
			}

			if (settings.time !== null) {
				jump(settings.time, settings.timeId, settings.url);
			}

			function jump(time, element_id, url) { //X秒跳转
				if (stop === 0) return false
				_jumpfunc = window.setTimeout(function() {
					time--;
					if (time > 0) {
						if (jumpstop == 1) {
							return false;
						} else {

							$(element_id).html(time + "秒");
							jump(time, element_id, url)
						}
					} else {
						if (url == null) {
							$('#blacklayer').remove();
							$(settings.popId).remove();
						} else {
							document.location = url;
						}
					}
				}, 1000);
			}
		},
		tag: function(options) { //标签切换
			var settings = {
				'type': "click",
				'selected': 'on',
				'contentClass': '.content',
				'func': null
			};
			// 如果存在选项，则合并之
			if (options) {
				$.extend(settings, options);
			}
			if (settings.type != 'click' && settings.type != 'mouseover') return false;
			$(this).eq(0).addClass(settings.selected);
			return this.each(function() {
				var $this = $(this);
				$(settings.contentClass).hide();
				$(settings.contentClass).eq(0).show();
				$this.bind(settings.type, contentShow);

				function contentShow() {
					var _index = $this.index();
					$this.siblings().removeClass(settings.selected);
					$this.addClass(settings.selected);
					$(settings.contentClass).hide();
					$(settings.contentClass).eq(_index).show();
					if (settings.func != null) {
						settings.func();
					}
				}
			})
		}
	};
	$.fn.tooltip = function(method) {
		// Method calling logic
		if (methods[method]) {
			return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
		} else if (typeof method === 'object' || !method) {
			return methods.init.apply(this, arguments);
		} else {
			$.error('Method ' + method + ' does not exist on jQuery.tooltip');
		}
	};
})(jQuery);


var JKXY = JK = JKXY || {};
JKXY.msgBox = function(status, msg, show_time, callBack) {
	var msg = msg ? msg : '亲爱的VIP，这是来自极客学院小雪的 Hello~';
	var id = "warning";
	var show_time = parseInt(show_time) ? parseInt(show_time) : 1500;
	switch (status) {
		case 1:
			var color_class = "waring-success";
			break;
		case 0:
			var color_class = "waring-failure";
			break;
		case 2:
		default:
			var color_class = "waring-sub";
			break;
	}
	var html;
	html = '<div class="web-dia-tip ' + color_class + '" id="' + id + '" >';
	html += msg;
	html += '</div>';
	$('body').append(html);

	var _W = $('#' + id).width() / 2;
	$('#' + id).css("marginLeft", -_W);
	$('#' + id).animate({
		top: "0px",
		opacity: 1
	}, 300, function() {
		$('#' + id).delay(show_time).animate({
			top: "-50px",
			opacity: 0
		}, 500, function() {
			$('#' + id).remove();
			if (typeof(callBack) == 'function') {
				callBack();
			}
		});
	});

};


var regpop = {
init:function(){},
	popHtml: function() { //注册
		var html = '<div id="reg-pop" class="dialog">';
		html += '<div class="dialog-box">';
		html += ' <h3><i class="popclose"></i>注册</h3>';
		html += '<div class="pop-input-list">';
		html += '<div class="dialog-tabs"><ul>';
		html += '<li id="phoneRegPop"><i class="icon i-feg-phone"></i>手机号注册</li>';
		html += '<li id="emailRegPop" class="curr"><i class="icon i-feg-mail"></i>邮箱注册</li></ul></div>';
		html+='<form id="myform4" action="'+ webUrl +'/submit/reg?jsoncallback=?&is_ajax=1">';
		html += ' <ul style="height:170px;">';
		html += ' <li> <img src="' + cdn_url + 'images/right.png" class="right" style="display: none">';
		html += ' </li><li>';
		html += ' <input type="text" placeholder="邮箱" class="user-name" autocomplete="off" name="email" id="email4"/>';
		html += '<p class="color-red pop-warning"></p>';
		html += ' </li>';
		html += ' <li>';
		//html+=' <img src="'+ cdn_url +'images/right.png" class="right">';
		html += ' <input type="password" name="password" placeholder="密码" class="user-password" id="password" size="32" autocomplete="off" />';
		html += '<p class="color-red pop-warning"></p>';
		html += ' </li>';
		html += ' <li class="cf">';
		html += '<input type="text" style="width:94px" name="verify" id="safenumber4" class="input-tow uer-safe" placeholder="验证码" autocomplete="off" />';
		html += ' <div class="security-code"> <img src='+safeCodeUrl+' class="phone-safecode"></div>';
		html += '<span class="warning-word phone-safecode"> 看不清楚？换一张</span>';
		html += '<p class="color-red pop-warning"></p>';
		html += ' </li></ul>';
		html += ' <div class="inputbox cf">';
		html += ' </div> <button type="button" class="greenbtn myform4-btn" id="reg-nbtn">同意用户协议，注册</button>';
		html+='</form>';
		html += '<div class="user-xy"><a href="' + wwwUrl + '/help/service.html" target="_blank">《极客学院用户协议》</a> </div>'
		html += '  <div class="no-zhanghao">已有账号？<a href="javascript:void(0)" class="loginnow">立即登录</a></div>';
		html += '<h4 class="mar-b20 mar-t20">用第三方账号<span style="color: #35b558">直接登录</span>，无需注册</h4>';
		html += ' <ul class="login-three cf">';
		html += ' <li><a href="' + qq_login_url + '"><img src="' + cdn_url + 'images/qq-s.png"><span>QQ账号登录</span></li>';
		html += ' <li><a href="' + wx_login_url + '"><img src="' + cdn_url + 'images/wx-s.png"><span>微信账号登录</span></li>';
		html += '<li><a href="' + weibo_login_url + '"><img src="' + cdn_url + 'images/sina-s.png"><span>新浪账号登录</span></li>';
		html += ' <li><a href="' + eoe_login_url + '"><img src="' + cdn_url + 'images/eoe-s.png"><span>eoe账号登录</span></li>';

		html += '</ul>'
		html += ' </div>';
		html += '</div>';
		html += '</div>';
		return html;

	},
	pop: function() {
		$().tooltip("pop", {
			width: 420,
			height: 570,
			popId: '#reg-pop',
			opacity: 0.4,
			popHtml: regpop.popHtml(),
			popFunc : function(){
				//$('#myform4').find('input').val('')
			}
		})

		verify4();
        $('.myform4-btn').on("click",function(){
        	var verifyover = $('#myform4').valid();
			if(verifyover){
				var url = $('#myform4').attr("action");
				var data= $("#myform4").serialize();
				$.post(url,data,function(data){
					if(data.status == 1){
						//JKXY.msgBox(1,data.msg);
						document.location.href=document.location.href;
					} else{
						$('#myform4 .phone-safecode').click();
						$('#myform2 #safenumber4').val('');
						JKXY.msgBox(0,data.msg)
					}

				},'json')
			}
			return false;
        })

		$('#password').ckPassWord("strong");
		 $('.phone-safecode').on('click',function(){
         	var timenow = new Date().getTime();
            $('.security-code>img').attr("src", safeCodeUrl+'?'+timenow);
         })
	}

}


// 手机注册弹窗
var phoneregpop = {
		init:function(){},
	popHtml: function() { //注册
		var html = '<div id="reg-pop" class="dialog pop-reg-phone">';
		html += '<div class="dialog-box" id="checkPhoneForm">';
		html += ' <h3><i class="popclose"></i>注册</h3>';
		html += '<div class="pop-input-list">';
		html += '<div class="dialog-tabs"><ul>';
		html += '<li id="phoneRegPop" class="curr"><i class="icon i-feg-phone"></i>手机号注册</li>';
		html += '<li id="emailRegPop"><i class="icon i-feg-mail"></i>邮箱注册</li></ul></div>';
		html+='<form id="myform3" action="'+ webUrl +'/submit/reg_phone?jsoncallback=?&is_ajax=1" >';
		html += ' <ul class="reg-phone-form">';
		html += ' <li>';
		html += '<input type="text" name="phone" placeholder="手机号用于登录、接收F码等" class="mobile" id="phoneNum" autocomplete="off"/>';
		html += '<p class="color-red pop-warning"></p>';
		html += ' </li>';
		html += ' <li>';
		html += '<input type="text" class="input-tow user-mobileCode" size="32"  tabindex="3" name="verify_code" id="safecode3" placeholder="动态码" autocomplete="off" />';
		html += '<a href="javascript:void(0);" class="freevip-form-btn freebtn-btn-green getcode " id="getcodeBtn" >免费获取动态码</a>';
		html += '<p class="color-red pop-warning"></p>';
		html += ' </li>';
		html += ' <li>';
		html += ' <input type="password" placeholder="密码" class="user-password" name="password" id="password" size="32" autocomplete="off"/>';
		html += ' </li>';
		html += ' <li class="cf">';
		html += '<input type="text" style="width:94px" name="verify" id="phonePopCheckCode3" class="input-tow uer-safe" autocomplete="off" placeholder="验证码" />';
		html += ' <div class="security-code"> <img src='+safeCodeUrl+' class="phone-safecode"></div>';
		html += '<span class="warning-word phone-safecode" > 看不清楚？换一张</span>';
		html += '<span class="color-red pop-warning"></span>';
		html += ' </li></ul>';
		html += ' <div class="inputbox cf">';
		html += '<input type="hidden" id="reg_type" value="phone" />';
		html += ' </div> <button type="button" class="greenbtn myform3-btn" id="phone-reg-nbtn">同意用户协议，注册</button>';
		html+='</form>';
		html += '<div class="user-xy"><a href="' + wwwUrl + '/help/service.html" target="_blank">《极客学院用户协议》</a> </div>'
		html += '  <div class="no-zhanghao">已有账号？<a href="javascript:void(0)" class="loginnow">立即登录</a></div>';
		html += '<h4 class="mar-b10 mar-t10">用第三方账号登录</h4>';
		html += ' <ul class="login-three cf">';
		html += ' <li><a href="' + qq_login_url + '"><img src="' + cdn_url + 'images/qq-s.png"><span>QQ账号登录</span></li>';
		html += ' <li><a href="' + wx_login_url + '"><img src="' + cdn_url + 'images/wx-s.png"><span>微信账号登录</span></li>';
		html += '<li><a href="' + weibo_login_url + '"><img src="' + cdn_url + 'images/sina-s.png"><span>新浪账号登录</span></li>';
		html += ' <li><a href="' + eoe_login_url + '"><img src="' + cdn_url + 'images/eoe-s.png"><span>eoe账号登录</span></li>';
		html += '</ul>'
		html += ' </div>';
		html += '</div>';
		html += '</div>';
		return html;
	},
	bindEle: function() {
		// $('.diaLoginBtn').bind("click", this.pop)
	},
	pop: function() {
		$().tooltip("pop", {
			width: 420,
			height: 570,
			popId: '#reg-pop',
			opacity: 0.4,
			popHtml: phoneregpop.popHtml(),
			closePop: function() {},
			popFunc : function(){
				//$('#myform3').find('input').val('')
			}
		})
		verify3();
		$('#password').ckPassWord("strong");
		$('#phone-reg-nbtn').on("click",function(){
			var verifyover = $('#myform3').valid();
			if(verifyover){
				var url = $('#myform3').attr("action");
				var data= $("#myform3").serialize();
				try{
				$.post(url,data,function(data){
					if(data.status == 1){
						document.location.href=document.location.href;
					} else{
						$('#myform3 .phone-safecode').click();
						$('#myform2 #phonePopCheckCode3').val('');
						JKXY.msgBox(0,data.msg)
					}

				},'json')
				}catch(e){
					alert();
				}
			}
		})

		freeLogin.init();

		//验证码
            $('.phone-safecode').on('click',function(){
                var timenow = new Date().getTime();
                $('.security-code>img').attr("src", safeCodeUrl+'?'+timenow);
            })
	}
}





//延时跳转
var delayJumpUrl = function(url, millisec) {
	setTimeout(function() {
		window.location.href = url;
	}, millisec)
}





//登录弹出框
var loginpop = {
		init:function(){},
	popHtml: function() {
		var html = '<div id="login-pop" class="dialog">';
		html += '<div class="dialog-box">';
		html += ' <h3><i class="popclose"></i>登录</h3>';
		html += '<div class="pop-input-list">';
		html += '<div class="dialog-tabs"><ul>';
		html += '<li id="memberLoginPop" class="curr">会员登录</li>';
		html += '<li id="phoneLoginPop">免注册登录</li></ul></div>';
		html+='<form id="myform1" action="'+ webUrl +'/submit/login?jsoncallback=?&is_ajax=1" method="post">';
		html += ' <ul style="height:170px;">';
		html += ' <li> <img src="' + cdn_url + 'images/right.png" class="right" style="display: none">';
		html += ' </li><li>';
		html += ' <input type="text" placeholder="邮箱/用户名/手机号" value="" class="username" name="uname" id="username" autocomplete="off"/>';
		html += '<p class="color-red pop-warning"></p>';
		html += ' </li>';
		html += ' <li>';
		html += ' <input type="password" name="password" placeholder="密码" class="password" id="passwordd" size="32" autocomplete="off" />';
		html += ' <input type="hidden"  id="verifypwd" name="verifypwd" />';
		html += '<p class="color-red pop-warning"></p>';
		html += ' </li>';
		html += ' <li class="cf">';
		html += '<input type="text" style="width:94px" name="verify" id="safecode1" class="input-tow uer-safe" placeholder="验证码" autocomplete="off" />';
		html += ' <div class="security-code"> <img src='+safeCodeUrl+' class="phone-safecode"></div>';
		html += '<span class="warning-word phone-safecode"> 看不清楚？换一张</span>';
		html += '<p class="color-red pop-warning"></p>';
		html += ' </li></ul>';
		html += ' <div class="inputbox cf">';
		html += '<div class="sevenday" style="padding-left:0;"><i class="choose-this checkbox"></i>7天内免登录 <a href="' + webUrl + '/sso/forget" >忘记密码？</a></div>';
		html += ' </div> <input type="button" class="greenbtn mar-b20 myform1-btn" id="loginbtn" style="padding-left:0px" value="登录" />';
		html+='</form>';
		html += '  <div class="no-zhanghao">还没有账号？<a href="javascript:void(0)" class="regnow">立即注册</a></div>';
		html += '<h4 class="mar-b20 mar-t20">用第三方账号<span style="color: #35b558">直接登录</span>，无需注册</h4>';
		html += ' <ul class="login-three cf">';
		html += ' <li><a href="' + qq_login_url + '"><img src="' + cdn_url + 'images/qq-s.png"><span>QQ账号登录</span></li>';
		html += ' <li><a href="' + wx_login_url + '"><img src="' + cdn_url + 'images/wx-s.png"><span>微信账号登录</span></li>';
		html += '<li><a href="' + weibo_login_url + '"><img src="' + cdn_url + 'images/sina-s.png"><span>新浪账号登录</span></li>';
		html += ' <li><a href="' + eoe_login_url + '"><img src="' + cdn_url + 'images/eoe-s.png"><span>eoe账号登录</span></li>';
		html += '</ul>'
		html += ' </div>';
		html += '</div>';
		html += '</div>';
		return html;
	},
	bindEle: function() {
		$('.diaLoginBtn').bind("click", this.pop)
	},
	pop: function() {
		$().tooltip("pop", {
			width: 420,
			height: 548,
			popId: '#login-pop',
			opacity: 0.4,
			popHtml: loginpop.popHtml(),
			popFunc : function(){
				//$('#myform1').find('input').val('')
			}

		})
		verify1();
		$('.myform1-btn').on("click",function(){
			var verifyover = $('#myform1').valid();
			if(verifyover){
				var url = $('#myform1').attr("action");

				var data= $("#myform1").serialize();
				$.post(url,data,function(data){
					if(data.status == 1){
						window.location.href=window.location.href;
					} else{
						$('#myform1 .phone-safecode').click();
						$('#myform2 #safecode1').val('');
						JKXY.msgBox(0,data.msg)
					}

				},'json')
			}
		})

		//验证码
        $('.phone-safecode').on('click',function(){
            var timenow = new Date().getTime();
            $('.security-code>img').attr("src", safeCodeUrl+'?'+timenow);
        })
        $('body').delegate('.checkbox', 'click', function () {
			if($("input[name='mobile']").is(":visible")){
				var phone = $("input[name='mobile']").val();
			}
			if ($('.checkbox').hasClass("choose-this")) {
				$('.checkbox').removeClass("choose-this");
			} else {
				$('.checkbox').addClass("choose-this");
			}
		})

	}
}

// 手机登录弹窗
var phoneloginpop = {
	init: function() {
		$("body").delegate("#free_reg_phone_login", 'click', function() {
//			free_reg_phone_login();
			//set_Cookie();
		});
		$('body').delegate('#save_phone', 'click', phoneloginpop.chkbox);
	},
	popHtml: function() {
		var html = '<div id="login-pop" class="dialog pop-login-phone">';
		html += '<div class="dialog-box" id="checkPhoneForm">';
		html += '<h3><i class="popclose"></i>登录</h3>';
		html += '<div class="pop-input-list">';
		html += '<div class="dialog-tabs"><ul>';
		html += '<li id="memberLoginPop">会员登录</li>';
		html += '<li id="phoneLoginPop" class="curr">免注册登录</li></ul></div>';
		html+='<form id="myform2" action="'+ webUrl +'/submit/login_phone?jsoncallback=?&is_ajax=1" method="post">';
		html += '<ul class="login-phone-form" style="height:170px;">';
		html += '<li>';
		html += '<input type="text" name="phone"  class="user-name" placeholder="手机号" id="phoneNum2" tabindex="1" autocomplete="off" />';
		html += '<p class="color-red pop-warning"></p>';
		html += '</li><li>';
		html += '<input type="text" class="input-tow uer-safe" size="32"  tabindex="2" name="verify_code" id="phone_code2" autocomplete="off" />';
		html += '<a href="javascript:void(0);" class="freevip-form-btn freebtn-btn-green getcode" id="getcodeBtn2" >发送短信验证码</a>';
		html += '<p class="color-red pop-warning"></p>';
		html += '</li><li>';
		html += '<input type="text" style="width:94px" name="verify" class="input-tow safe-number uer-safe" size="32" autocomplete="off" id="checkCode2" tabindex="3" placeholder="验证码"/>';
		html += '<div class="security-code"> <img src='+safeCodeUrl+' class="phone-safecode"></div>';
		html += '<span class="warning-word phone-safecode"> 看不清楚？换一张</span>';
		html += '<input type="hidden" name="login_type" id="login_type" value="free_reg" />';
		html += '<p class="color-red pop-warning"></p>';
		html += '</li></ul>';
		html += '<div class="inputbox cf">';
		html += '<div class="sevenday" style="padding-left:0;"><i class="choose-this" id="save_phone"></i>记住手机号 <a href="'+ webUrl +'/sso/forget" >忘记密码？</a></div>';
		html += '</div> <button type="button" class="greenbtn mar-b20 myform2-btn" id="free_reg_phone_login" tabindex="4">登录</button>';
		html+='</form>';
		html += '<div class="no-zhanghao">还没有账号？<a href="javascript:void(0)" class="regnow">立即注册</a></div>';
		html += '<h4 class="mar-b20 mar-t20">用第三方账号<span style="color: #35b558">直接登录</span>，无需注册</h4>';
		html += '<ul class="login-three cf">';
		html += '<li><a href="' + qq_login_url + '"><img src="' + cdn_url + 'images/qq-s.png"><span>QQ账号登录</span></li>';
		html += '<li><a href="' + wx_login_url + '"><img src="' + cdn_url + 'images/wx-s.png"><span>微信账号登录</span></li>';
		html += '<li><a href="' + weibo_login_url + '"><img src="' + cdn_url + 'images/sina-s.png"><span>新浪账号登录</span></li>';
		html += '<li><a href="' + eoe_login_url + '"><img src="' + cdn_url + 'images/eoe-s.png"><span>eoe账号登录</span></li>';
		html += '</ul>'
		html += '</div>';
		html += '</div>';
		html += '</div>';
		return html;
	},
	bindEle: function() {
		$('body').delegate('#phoneLoginPop:not(".curr")', 'click', function() {
			$('.popclose').click();
			phoneloginpop.pop();
		});
	},
	pop: function() {
		$().tooltip("pop", {
				width: 420,
				height: 548,
				popId: '#login-pop',
				opacity: 0.4,
				popHtml: phoneloginpop.popHtml(),
				closePop: function() {},
				popFunc : function(){
					//$('#myform2').find('input').val('')
				}
		})
		var myphone = $.cookie("phone");
		if(myphone != ""){
			$("input[name='phone']").val(myphone);
		}

		verify2();
		$('.myform2-btn').on("click",function(){
			var verifyover = $('#myform2').valid();
			if(verifyover){
				var url = $('#myform2').attr("action");
				var data= $("#myform2").serialize();

				$.post(url,data,function(data){
					if(data.status == 1){
						//JKXY.msgBox(1,data.msg);
						document.location.href=document.location.href;
					} else{
						$('#myform2 .phone-safecode').click();
						$('#myform2 #checkCode2').val('');
						JKXY.msgBox(0,data.msg)
					}

				},'json')
			}
			return false;
		})

		freeLogin2.init();
			//验证码
        $('.phone-safecode').on('click',function(){
            var timenow = new Date().getTime();
            $('.security-code>img').attr("src", safeCodeUrl+'?'+timenow);
        })
		$('body').delegate('.checkbox', 'click', function () {
			if($("input[name='mobile']").is(":visible")){
				var phone = $("input[name='mobile']").val();
			}
			if ($('.checkbox').hasClass("choose-this")) {
				$('.checkbox').removeClass("choose-this");
				$.cookie("phone","");
			} else {
				$('.checkbox').addClass("choose-this");
				$.cookie("phone",phone);
			}
		})
	},
	chkbox: function() {
		if ($('#save_phone').hasClass("choose-this")) {
			$('#save_phone').removeClass("choose-this");
			phone_cookie_life_time = 0;
		} else {
			$('#save_phone').addClass("choose-this");
			phone_cookie_life_time = 7;
		}
	}
};

var verify1 = function(){
	$(document).ready(function(){
		$("#myform1").validate({
			errorPlacement: function(error, element){
				var error_td = element.parent().find('.pop-warning');
				error_td.append(error);

			},
			success: function(label){
				label.addClass("right").html('&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;');
			},
			onkeyup: false,
			rules: {
				password: {
					required: true,
					minlength:6,
					maxlength:32
				},
				verify:{
					required:true,
					remote:{
						url :webUrl+'/check/verify?is_ajax=1&is_page=1&jsoncallback=?',
						type:'post',
						data:{
							verify : function(){
								return $("#safecode1").val();
							}
						}
					}
				},
				uname: {
					required:true
				}
			},
			messages: {
				email: {required:"邮箱不能为空！",email:"邮箱号格式错误！",remote:"邮件已存在！"},
				phone: {required:"手机号不能为空！",phone:"手机号格式错误！"},
				uname: {required:"用户名不能为空！",remote:"用户名已存在！"},
				password: {required:"密码不能为空！",minlength:"密码长度不能小于6位!"},
				verify: {required:"验证码不能为空",remote:"验证码错误！"},
				safecode: {required:"短信验证码不能为空！",remote:"短信验证码错误！"}
			}
		});
	});
}
var verify2 = function(){
	$(document).ready(function(){
		$("#myform2").validate({
			errorPlacement: function(error, element){
				var error_td = element.parent().find('.pop-warning');
				error_td.append(error);

			},
			success: function(label){
				label.addClass("right").html('');
			},
			onkeyup: false,
			rules: {
				phone: {
					required:true,
					phone:[],
//					remote:{
//						url :webUrl+'/check/phone?is_ajax=1&is_page=1&jsoncallback=?',
//						type:'post',
//						data:{
//							phone : function(){
//								return $("#phoneNum2").val();
//							}
//						}
//					}
				},
				verify_code:{
					required:true
				},
				verify:{
					required:true,
					remote:{
						url :webUrl+'/check/verify?is_ajax=1&is_page=1&jsoncallback=?',
						type:'post',
						data:{
							verify : function(){
								return $("#checkCode2").val();
							}
						}
					}
				}
			},
			messages: {
				email: {required:"邮箱不能为空！",email:"邮箱号格式错误！",remote:"邮件已存在！"},
				phone: {required:"手机号不能为空！",phone:"手机号格式错误",remote:"手机号已存在！"},
				username: {required:"用户名不能为空！",remote:"用户名已存在！"},
				password: {required:"密码不能为空！",minlength:"密码长度不能小于6位!"},
				verify: {required:"验证码不能为空",remote:"验证码错误！"},
				verify_code: {required:"短信验证码不能为空！",remote:"短信验证码错误！"}
			}

		});
	});
}
var verify3 = function(){
	$(document).ready(function(){
		$("#myform3").validate({
			errorPlacement: function(error, element){
				var error_td = element.parent().find('.pop-warning');
				error_td.append(error);

			},
			success: function(label){
				label.addClass("right").html('');
			},
			onkeyup: false,
			rules: {
				password: {
					required: true,
					minlength:6,
					maxlength:32
				},
				pwdstrong:{
					required: true
				},
				phone: {
					required:true,
					phone:[],
					remote:{
						url :webUrl+'/check/phone?is_ajax=1&is_page=1&jsoncallback=?',
						type:'post',
						data:{
							phone : function(){
								return $("#phoneNum").val();
							}
						}
					}
				},
				verify_code:{
					required:true
				},
				verify:{
					required:true,
					remote:{
						url :webUrl+'/check/verify?is_ajax=1&is_page =1&jsoncallback=?',
						type:'post',
						data:{
							verify : function(){
								return $("#phonePopCheckCode3").val();
							}
						}
					}
				}
			},
			messages: {
				email: {required:"邮箱不能为空！",email:"邮箱号格式错误！",remote:"邮件已存在！"},
				phone: {required:"手机号不能为空！",phone:"手机号格式错误！",remote:"手机号已注册！"},
				username: {required:"用户名不能为空！",remote:"用户名已存在！"},
				password: {required:"密码不能为空！",minlength:"密码长度不能小于6位!"},
				verify: {required:"验证码不能为空",remote:"验证码错误！"},
				verify_code: {required:"短信验证码不能为空！",remote:"短信验证码错误！"}
			}
		});
	});
}
var verify4 = function(){
	$(document).ready(function(){
		$("#myform4").validate({
			errorPlacement: function(error, element){
				var error_td = element.parent().find('.pop-warning');
				error_td.append(error);

			},
			success: function(label){
				label.addClass("right").html('&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;');
			},
			onkeyup: false,
			rules: {
				password: {
					required: true,
					minlength:6,
					maxlength:32
				},
				email: {
					required:true,
					email:true,
					remote:{
						url :webUrl+'/check/email?is_ajax=1&is_page=1&jsoncallback=?',
						type:'post',
						data:{
							email: function(){
								return $("#email4").val();
							}
						}
					}
				},
				verify:{
					required:true,
					remote:{
						url :webUrl+'/check/verify?is_ajax=1&is_page=1&jsoncallback=?',
						type:'post',
						data:{
							verify : function(){
								return $("#safenumber4").val();
							}
						}
					}
				}
			},
			messages: {
				email: {required:"邮箱不能为空！",email:"邮箱号格式错误！",remote:"邮箱已存在或格式错误！"},
				mobile: {required:"手机号不能为空！",phone:"手机号格式错误！"},
				username: {required:"用户名不能为空！",remote:"用户名已存在！"},
				password: {required:"密码不能为空！",minlength:"密码长度不能小于6位!"},
				verify: {required:"验证码不能为空",remote:"验证码错误！"},
				safecode: {required:"短信验证码不能为空！",remote:"短信验证码错误！"}
			}
		});
	});
}
var freeLogin={
	_LOCK:true,
	init:function(){
		this.bindEle();
	},
	bindEle:function(){
		var that = this;
		$('#getcodeBtn').on("click",function(){
			if(freeLogin._LOCK){
				that.getCode();
			}
		});
	},
	getCode:function(){
		var that = this;
		var total = 60;
		var me = $(this);
		me.next('.pop-warning').removeClass("wrong");
		var value = $.trim($('#phoneNum').val());
		var mobileRule = /^(13[0-9]|14[5|7]|15[0|1|2|3|5|6|7|8|9]|18[0-9]|17[0-9])\d{8}$/;
		var type = mobileRule.test(value);
		var has = $('#phoneNum').next("p").children().length;
		var label = $('#phoneNum').next("p").children("label").text();
		if(type && (has == 0 || label =="")){
			freeLogin._LOCK = false;
			$('#getcodeBtn').html("短信发送中~");
			//$('#phoneNum').attr("disabled","disabled");
			$.ajax({
				data:{'type' : '4', 'phone': value},
				type:"post",
				url:webUrl + '/sso/sms?jsoncallback=?&is_ajax=1&is_page=1',
				success:function(data){
					if(data.status == 1){
						JKXY.msgBox(1, data.msg);
					}else{
						JKXY.msgBox(0, data.msg);
						total = 0
						freeLogin._LOCK = true;
						
					}
					freeLogin.addTime($('#getcodeBtn'),total)
				},
				error:function(){

				},
				complete:function(){

				},
				dataType:'json'
			});
			//freeLogin.addTime($('#getcodeBtn'),total)
		} else{
//			var txt ='<label for="phoneNum" generated="true" class="error">手机号不能为空！</label>';
//			$('#phoneNum').parent().find(".pop-warning").html(txt).addClass("wrong")
		}

	},
	addTime:function(m,total){
		var t = setInterval(function(){
			var txt ="("+total+"秒)后重新发送";
			m.html(txt).addClass('disabled');
			total--;
			if( total == -1 ){
				clearInterval(t);
				freeLogin._LOCK = true;
				m.html("重新发送").removeClass('disabled');
			}

		},1000)
	}
}

var freeLogin2={
	_LOCK:true,
	init:function(){
		this.bindEle();
	},
	bindEle:function(){
		var that = this;
		$('#getcodeBtn2').on("click",function(){
			if(freeLogin2._LOCK){
				that.getCode();
			}
		});
	},
	getCode:function(){

		var that = this;
		var total = 60;
		var me = $(this);
		me.next('.pop-warning').removeClass("wrong");
		var value = $.trim($('#phoneNum2').val());
		
		var mobileRule = /^(13[0-9]|14[5|7]|15[0|1|2|3|5|6|7|8|9]|18[0-9]|17[0-9])\d{8}$/;
		var type = mobileRule.test(value);
		var has = $('#phoneNum2').next("p").children().length;
		var label = $('#phoneNum2').next("p").children("label").text();
		
		if(type && (has == 0 || label =="")){
			freeLogin2._LOCK = false;
			$('#getcodeBtn2').html("短信发送中~");
			//$('#phoneNum2').attr("disabled","disabled")
			$.ajax({
				data:{'type' : '5', 'phone': value},
				type:"post",
				url:webUrl + '/sso/sms?jsoncallback=?&is_ajax=1',
				success:function(data){
					if(data.status == 1){
						JKXY.msgBox(1,data.msg);

					}else{
						JKXY.msgBox(0,data.msg);
						total = 0;
						freeLogin2._LOCK = true;
					}

					freeLogin2.addTime($('#getcodeBtn2'),total)
				},
				error:function(){

				},
				complete:function(){

				},
				dataType:'json'
			});

		} else{
			var txt ='<label for="phoneNum2" generated="true" class="error">手机号为空或格式错误！</label>';
			$('#phoneNum2').parent().find(".pop-warning").html(txt)//.addClass("wrong")
		}

	},
	addTime:function(m,total){
		var t = setInterval(function(){
			var txt ="("+total+"秒)后重新发送";
			m.html(txt).addClass('disabled');
			total--;
			if( total == -1 ){
				clearInterval(t);
				freeLogin2._LOCK = true;
				m.html("重新发送").removeClass('disabled');
			}

		},1000)
	}
}
$(function() {
	phoneregpop.init();
	phoneloginpop.init();
	$('body').delegate('#memberLoginPop:not(".curr")', 'click', function() {
		$('.popclose').click();
		loginpop.pop();
	});
	$('body').delegate('#emailRegPop:not(".curr")', 'click', function() {
		$('.popclose').click();
		regpop.pop();
	});
	$('body').delegate('#phoneRegPop:not(".curr")', 'click', function() {

		$('.popclose').click();

		phoneregpop.pop();
	});
	$('#diaregBtn,.diaRegBtn').on('click', function() {
		phoneregpop.pop()
	});
	$('body').delegate('.regnow', 'click', function() {
		$('.popclose').click();
		phoneregpop.pop();
	});
	$('#diaLoginBtn,.diaLoginBtn').on('click', function() {
		loginpop.pop();
	})

	$('body').delegate('.loginnow', 'click', function() {
		$('.popclose').click();
		loginpop.pop();
	});
	$('body').delegate('#phoneLoginPop:not(".curr")', 'click', function() {
		$('.popclose').click();
		phoneloginpop.pop();
	});

})

