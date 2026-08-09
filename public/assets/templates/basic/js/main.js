'use strict';
(function ($) {
    const config = {
        init() {
            this.heightCalculation();
            this.activeHeader();
            this.bannerSlider();
            this.allCatSlider();
            this.topSellingSlider();
            this.topDealSlider();
            this.limitedStock();
            this.dealCount();
            this.aboutUsBrandSlider();
            this.scrollToTop();
            this.fixedHeader();
            this.backgroundImage();
            this.maskImage();
            this.togglePassword();
            this.testimonialSlider();
            this.customTab();
            this.customAccordion();
            this.activeFancyBox();
            this.cardSidebar();
            this.ratingControl();
            this.activeSelect2();
            //! Project Owner Preference
            this.hideNavbar();
            this.sidebarOverlay();
            this.activeTimer();
            this.hightlightTitle();
            this.navHorizontal();
            this.inputCopy();
            this.inputPassword();
        },

        heightCalculation() {
            const headerHeight = document.querySelector(".header")?.offsetHeight || 0;
            document.documentElement.style.setProperty(
                "--header-height",
                `${headerHeight}px`
            );
        },
        activeHeader() {
            if ($('.category-list').length) {
                var $desktopMenu = $(".category-list > .category-dropdown");
                var $mobileMenu = $("#cateGoryDropdown > ul");

                $desktopMenu.each(function () {
                    var $category = $(this);

                    // Level 1 LI
                    var $level1Li = $("<li/>", { "class": "dropdown" });
                    var $mainLink = $category.children("a").clone();
                    $level1Li.append($mainLink);

                    // Sub UL
                    var $subUl = $("<ul/>");

                    // Loop columns
                    $category.find(".single-column").each(function () {
                        var $column = $(this);
                        var $level2Li = $("<li/>", { "class": "dropdown" });

                        // Column title
                        var title = $column.find("p").text();
                        var $titleLink = $("<a/>", { href: "#", text: title });
                        $level2Li.append($titleLink);

                        // Menu items
                        var $level2Ul = $("<ul/>");
                        $column.find("ul > li > a").each(function () {
                            var $menuLi = $("<li/>").append($(this).clone());
                            $level2Ul.append($menuLi);
                        });

                        $level2Li.append($level2Ul);
                        $subUl.append($level2Li);
                    });

                    $level1Li.append($subUl);
                    $mobileMenu.append($level1Li);
                });
            }

            //Submenu Dropdown Toggle
            if ($('.main-header li.dropdown ul').length) {
                $('.main-header .navigation li.dropdown').append('<div class="dropdown-btn"><span class="fas fa-angle-down"></span></div>');
            }

            //Mobile Nav Hide Show
            if ($('.mobile-menu').length) {
                var mobileMenuContent = $('.main-header .menu-area .main-menu').html();
                $('.mobile-menu .menu-box .menu-outer').append(mobileMenuContent);

                //Dropdown Button
                $('.mobile-menu li.dropdown .dropdown-btn').on('click', function () {
                    $(this).toggleClass('open');
                    $(this).prev('ul').slideToggle(500);
                });

                //Menu Toggle Btn
                $('.mobile-nav-toggler').on('click', function () {
                    $('body').addClass('mobile-menu-visible');
                });

                //Menu Toggle Btn
                $('.mobile-menu .menu-backdrop,.mobile-menu .close-btn').on('click', function () {
                    $('body').removeClass('mobile-menu-visible');
                });
            }
        },
        bannerSlider() {
            $('.banner-slider').not('.slick-initialized').slick({
                slidesToShow: 1,
                slidesToScroll: 1,
                infinite: true,
                autoplay: true,
                fade: true,
                arrows: true,
                prevArrow:
                    '<button type="button" class="slick-prev"><i class="fas fa-chevron-left"></i></button>',
                nextArrow:
                    '<button type="button" class="slick-next"><i class="fas fa-chevron-right"></i></button>',
                responsive: [
                    {
                        breakpoint: 576,
                        settings: {
                            arrows: false,
                        },
                    }
                ],
            });

            let bannerCarousel = $('#banner-carousel');
            let bannerIndicators = $('#banner-carousel-indicators');

            if (bannerCarousel[0]) {
                new bootstrap.Carousel(bannerCarousel[0], {
                    pause: false,
                    ride: 'carousel',
                    touch: false
                });

                bannerCarousel.on('slide.bs.carousel', function (e) {
                    let indicatorActive = bannerIndicators.find(`[data-bs-slide-to="${e.to}"]`);

                    // Remove active class + aria-current attr from the Previously active button
                    bannerIndicators.find('button.active').removeClass('active').removeAttr('aria-current');

                    // Add active class + aria-current attr to the currently active button
                    indicatorActive.addClass('active').attr('aria-current', true);

                });
            }
        },
        allCatSlider() {
            $('.all-cat-block').each((index, el) => {
                const slider = $(el).find('.all-cat-block-slider');
                const ctrl = $(el).find('.all-cat-block-ctrl');

                slider.not('.slick-initialized').slick({
                    slidesToShow: 6,
                    slidesToScroll: 1,
                    infinite: false,
                    appendArrows: ctrl,
                    appendDots: ctrl,
                    prevArrow:
                        '<button type="button" class="slick-prev"><i class="las la-angle-left"></i></button>',
                    nextArrow:
                        '<button type="button" class="slick-next"><i class="las la-angle-right"></i></button>',
                    customPaging: () => '<button type="button"></button>',
                    responsive: [
                        {
                            breakpoint: 1200,
                            settings: {
                                slidesToShow: 5,
                            },
                        },
                        {
                            breakpoint: 992,
                            settings: {
                                slidesToShow: 4,
                            },
                        },
                        {
                            breakpoint: 768,
                            settings: {
                                slidesToShow: 3,
                            },
                        },
                        {
                            breakpoint: 576,
                            settings: {
                                slidesToShow: 2,
                            },
                        },
                    ],
                });
            })
        },
        topSellingSlider() {
            $('.top-selling-slider').not('.slick-initialized').slick({
                slidesToShow: 5,
                slidesToScroll: 1,
                infinite: false,
                arrows: false,
                responsive: [
                    {
                        breakpoint: 1200,
                        settings: {
                            slidesToShow: 4,
                        },
                    },
                    {
                        breakpoint: 992,
                        settings: {
                            slidesToShow: 3,
                        },
                    },
                    {
                        breakpoint: 768,
                        settings: {
                            slidesToShow: 2,
                        },
                    },
                    {
                        breakpoint: 576,
                        settings: {
                            slidesToShow: 1,
                        },
                    },
                ],
            });
        },
        topDealSlider() {
            $('.top-deal-slider').not('.slick-initialized').slick({
                slidesToShow: 3,
                slidesToScroll: 1,
                infinite: false,
                arrows: false,
                responsive: [
                    {
                        breakpoint: 1200,
                        settings: {
                            slidesToShow: 2,
                        },
                    },
                    {
                        breakpoint: 768,
                        settings: {
                            slidesToShow: 1,
                        },
                    }
                ]
            });
        },
        limitedStock() {
            $('.limited-stock-slider').not('.slick-initialized').slick({
                slidesToShow: 3,
                slidesToScroll: 1,
                infinite: false,
                arrows: false,
                responsive: [
                    {
                        breakpoint: 1200,
                        settings: {
                            slidesToShow: 2,
                        },
                    },
                    {
                        breakpoint: 768,
                        settings: {
                            slidesToShow: 1,
                        },
                    }
                ]
            });
        },
        dealCount() {
            if ($('.count-bar').length) {
                $('.count-bar').each(function () {
                    const el = $(this);
                    let percent = Number(el.data('percent'));

                    if (isNaN(percent)) {
                        percent = 0;
                    }

                    let color;

                    if (percent <= 20) {
                        color = 'red';
                    } else if (percent <= 50) {
                        color = 'orange';
                    } else if (percent <= 80) {
                        color = 'yellowgreen';
                    } else {
                        color = 'green';
                    }
                    $(el).css('background', color);
                    if (color) {
                    }
                    $(el).css('width', percent + '%').addClass('counted');
                }, { accY: -50 });

            }
        },

        aboutUsBrandSlider() {
            $('.about-brand-slider').not('.slick-initialized').slick({
                slidesToShow: 3,
                slidesToScroll: 1,
                speed: 1500,
                infinite: false,
                arrows: false,
                autoplay: true,
                responsive: [
                    {
                        breakpoint: 1200,
                        settings: {
                            slidesToShow: 4,
                        },
                    },
                    {
                        breakpoint: 992,
                        settings: {
                            slidesToShow: 6,
                        },
                    },
                    {
                        breakpoint: 768,
                        settings: {
                            slidesToShow: 4,
                        },
                    },
                    {
                        breakpoint: 425,
                        settings: {
                            slidesToShow: 3,
                        },
                    },
                ]
            });
        },

        fixedHeader() {
            $(window).on("scroll", function () {
                if ($(this).scrollTop() >= 300) {
                    $(".header").addClass("fixed-header");
                } else {
                    $(".header").removeClass("fixed-header");
                }
            });
        },

        scrollToTop() {
            const btn = $(".scroll-top");
            $(window).on("scroll", function () {
                if ($(window).scrollTop() >= 300) {
                    btn.addClass("show");
                } else {
                    btn.removeClass("show");
                }
            });

            btn.on("click", function (e) {
                e.preventDefault();
                $("html, body").animate({ scrollTop: 0 }, "300");
            });
        },

        maskImage() {
            // VIPURI: same guard as backgroundImage() — no `url(undefined)`.
            $('.mask-img[data-mask-image]').css('mask-image', function () {
                const image = $(this).data('mask-image');
                return image ? `url(${image})` : '';
            });

        },
        backgroundImage() {
            // VIPURI: skip elements with no image so a client-side navigation
            // never produces a request for `url(undefined)`.
            $(".bg-img[data-background-image]").css("background-image", function () {
                const image = $(this).data("background-image");
                return image ? `url(${image})` : "";
            });

        },
        togglePassword() {
            $(".toggle-password").on("click", function () {
                let input = $($(this).attr("id"));

                if (!input.length) {
                    input = $(this).siblings('input');
                }

                if (input.attr("type") == "password") {
                    input.attr("type", "text");
                    $(this).removeClass("fa-eye-slash").addClass("fa-eye");
                } else {
                    input.attr("type", "password");
                    $(this).removeClass("fa-eye").addClass("fa-eye-slash");
                }
            });
        },

        activeSelect2() {
            $('.select2').each((index, select) => {
                $(select).wrap('<div class="select2-wrapper"></div>').select2({
                    dropdownParent: $(select).closest('.select2-wrapper')
                });
            });

            $('.select2-auto-tokenize').each((index, select) => {
                $(select).wrap('<div class="select2-wrapper"></div>').select2({
                    tags: true,
                    tokenSeparators: [','],
                    dropdownParent: $(select).closest('.select2-wrapper')
                });
            });
        },

        activeRangeSlider() {
            if ($('input[type="range"]').length) {
                $('input[type="range"]').each(function () {
                    $(this).rangeslider({
                        polyfill: false,

                        onSlide: function (position, value) {
                            $(this.$element)
                                .siblings(".price-value")
                                .find(".text")
                                .text(value);
                            $(this.$element).siblings('[type="hidden"]').val(value);
                            $("#earning-amount").text(value * 20 * 30);
                        },
                    });
                });
            }

            // Update earning amount when range slider changes
            $('input[type="range"]').on("change", calculateEarning);

            function calculateEarning() {
                const sellPrice = $('input[name="sell-price"]').val();
                const dailySales = $('input[name="daily-sales"]').val();
                const earningAmount = sellPrice * dailySales * 30;
                $("#earning-amount").text(earningAmount);
            }
        },

        testimonialSlider() {
            $('.testimonial-slider').not('.slick-initialized').slick({
                slidesToShow: 3,
                slidesToScroll: 1,
                infinite: false,
                arrows: false,
                responsive: [
                    {
                        breakpoint: 1200,
                        settings: {
                            slidesToShow: 2,
                        },
                    },
                    {
                        breakpoint: 768,
                        settings: {
                            slidesToShow: 1,
                        },
                    }
                ],
            });
        },
        instagramSlider() {
            if ($('.instagram-carousel').length) {
                $('.instagram-carousel').owlCarousel({
                    loop: true,
                    margin: 2,
                    nav: false,
                    smartSpeed: 500,
                    autoplay: 1000,
                    responsive: {
                        0: {
                            items: 1
                        },
                        480: {
                            items: 2
                        },
                        600: {
                            items: 3
                        },
                        800: {
                            items: 4
                        },
                        1200: {
                            items: 6
                        }

                    }
                });
            }
        },
        dealSlider() {

            if ($('.best-deal-carousel').length) {
                var bestDealCount = $('.best-deal-carousel .inner-box').length;
                $('.best-deal-carousel').owlCarousel({
                    loop: bestDealCount > 3,
                    margin: 30,
                    nav: true,
                    smartSpeed: 500,
                    // autoplay: 1000,
                    autoplay: false,
                    navText: ['<span class="icon-10"></span>', '<span class="icon-11"></span>'],
                    responsive: {
                        0: {
                            items: 1
                        },
                        991: {
                            items: 2
                        },
                        1500: {
                            items: 3
                        }

                    }
                });
            }
        },

        customTab() {
            if ($('.tabs-box').length) {
                $('.tabs-box .tab-buttons .tab-btn').on('click', function (e) {
                    e.preventDefault();
                    var target = $($(this).attr('data-tab'));

                    if ($(target).is(':visible')) {
                        return false;
                    } else {
                        target.parents('.tabs-box').find('.tab-buttons').find('.tab-btn').removeClass('active-btn');
                        $(this).addClass('active-btn');
                        target.parents('.tabs-box').find('.tabs-content').find('.tab').fadeOut(0);
                        target.parents('.tabs-box').find('.tabs-content').find('.tab').removeClass('active-tab');
                        $(target).fadeIn(100);
                        $(target).addClass('active-tab');
                    }
                });
            }
        },

        activeOdometer() {
            $(".counterup-item").each(function () {
                $(this).isInViewport(function (status) {
                    if (status === "entered") {
                        for (
                            var i = 0;
                            i < document.querySelectorAll(".odometer").length;
                            i++
                        ) {
                            var el = document.querySelectorAll(".odometer")[i];
                            el.innerHTML = el.getAttribute("data-odometer-final");
                        }
                    }
                });
            });
        },

        hideNavbar() {
            $('.sidebar-menu__close, .sidebar-overlay').on('click', function () {
                $('.sidebar-menu').removeClass('show');
                $('.sidebar-overlay').removeClass('show');
            });
        },

        sidebarDropdown() {
            $('.has-dropdown > a').click(function () {
                $('.sidebar-submenu').slideUp(200);
                if ($(this).parent().hasClass('active')) {
                    $('.has-dropdown').removeClass('active');
                    $(this).parent().removeClass('active');
                } else {
                    $('.has-dropdown').removeClass('active');
                    $(this).next('.sidebar-submenu').slideDown(200);
                    $(this).parent().addClass('active');
                }
            });
        },
        userDropdown() {
            $('.user-info__button').on('click', function () {
                $('.user-info-dropdown').toggleClass('show');
            });
            $('.user-info__button').attr('tabindex', -1).focus();

            $('.user-info__button').on('focusout', function () {
                $('.user-info-dropdown').removeClass('show');
            });

        },
        sidebarOverlay() {
            $('.navigation-bar').on('click', function () {
                $('.sidebar-menu').addClass('show');
                $('.sidebar-overlay').addClass('show');
                console.log(this);

            });
        },
        sectionSubheadingBg() {
            $("[data-bg*='#']").each(function () {
                const bg = $(this).data('bg');
                if (bg) {
                    $(this).css('--data-bg', bg);
                }
            });

        },
        customAccordion() {

            if ($('.accordion-box').length) {
                $(".accordion-box").on('click', '.acc-btn', function () {

                    var outerBox = $(this).parents('.accordion-box');
                    var target = $(this).parents('.accordion');

                    if ($(this).hasClass('active') !== true) {
                        $(outerBox).find('.accordion .acc-btn').removeClass('active');
                    }

                    if ($(this).next('.acc-content').is(':visible')) {
                        return false;
                    } else {
                        $(this).addClass('active');
                        $(outerBox).children('.accordion').removeClass('active-block');
                        $(outerBox).find('.accordion').children('.acc-content').slideUp(300);
                        target.addClass('active-block');
                        $(this).next('.acc-content').slideDown(300);
                    }
                });
            }
        },
        activeFancyBox() {
            if ($('.lightbox-image').length) {
                $('.lightbox-image').fancybox({
                    openEffect: 'fade',
                    closeEffect: 'fade',
                    helpers: {
                        media: {}
                    }
                });
            }
        },
        changeView() {
            let listButton = $('button.list-view');
            let gridButton = $('button.grid-view');
            let wrapper = $('div.wrapper');

            listButton.on('click', function () {

                gridButton.removeClass('on');
                listButton.addClass('on');
                wrapper.removeClass('grid').addClass('list');

            });

            gridButton.on('click', function () {

                listButton.removeClass('on');
                gridButton.addClass('on');
                wrapper.removeClass('list').addClass('grid');

            });

        },
        cardSidebar() {
            function removeOverlay() {
                $('.body-overlay').removeClass('show');
                $('body').removeClass('scroll-hide-sm');
            }
            $('.shop-cart').on('click', function (e) {
                e.preventDefault();
                $('.cart__sidebar').addClass('show');
                $('.body-overlay').addClass('show');
                $('body').addClass('scroll-hide-sm');
            });
            $('.body-overlay').on('click', function () {
                $('.cart__sidebar').removeClass('show');
                removeOverlay()
            });

            $(document).on('click', '.sidebar-close-btn', function (e) {
                $(this).parents('.cart__sidebar').removeClass('show');
                removeOverlay();
            });
        },
        clientSlider() {
            if ($('.clients-carousel').length) {
                $('.clients-carousel').owlCarousel({
                    loop: true,
                    margin: 0,
                    nav: false,
                    autoplay: true,
                    autoplayTimeout: 1000,
                    autoplaySpeed: 6000,
                    autoplayHoverPause: false,
                    slideTransition: 'linear',
                    navText: ['<span class="icon-10"></span>', '<span class="icon-11"></span>'],
                    responsive: {
                        0: {
                            items: 2
                        },
                        576: {
                            items: 3
                        },
                        767: {
                            items: 3
                        },
                        991: {
                            items: 4
                        },
                        1199: {
                            items: 5
                        },
                        1300: {
                            items: 6
                        }
                    }
                });
            }
        },
        ratingControl() {
            const ratingLists = document.querySelectorAll('.rating-inner .rating-list[data-rating-control]');

            if (!ratingLists.length) return;

            ratingLists.forEach((list) => {
                const buttons = Array.from(list.querySelectorAll('button'));

                if (!buttons.length) return;

                let hiddenInput =
                    list.parentElement.querySelector('.js-rating-value') ||
                    list.parentElement.querySelector('input[name="rating"]');

                if (!hiddenInput) {
                    hiddenInput = document.createElement('input');
                    hiddenInput.type = 'hidden';
                    hiddenInput.name = list.dataset.ratingName || 'rating';
                    hiddenInput.value = '0';
                    hiddenInput.classList.add('js-rating-value');
                    list.insertAdjacentElement('afterend', hiddenInput);
                }

                let currentRating = Number(hiddenInput.value) || 0;

                list.setAttribute('role', 'radiogroup');
                list.setAttribute('aria-label', list.getAttribute('data-rating-label') || 'Rating');

                const applyVisualState = (value) => {
                    buttons.forEach((button, idx) => {
                        const isActive = idx < value;
                        button.classList.toggle('is-active', isActive);
                    });
                };

                const updateAria = (value) => {
                    buttons.forEach((button, idx) => {
                        const isChecked = value > 0 && idx === value - 1;
                        button.setAttribute('aria-checked', String(isChecked));
                    });
                };

                const updateTabIndex = (value) => {
                    const focusIndex = value > 0 ? value - 1 : 0;
                    buttons.forEach((button, idx) => {
                        button.tabIndex = idx === focusIndex ? 0 : -1;
                    });
                };

                const setRating = (value) => {
                    currentRating = value;
                    hiddenInput.value = String(value);

                    if (value) {
                        list.dataset.selectedRating = String(value);
                    } else {
                        list.removeAttribute('data-selected-rating');
                    }

                    applyVisualState(value);
                    updateAria(value);
                    updateTabIndex(value);
                };

                const previewRating = (value) => {
                    applyVisualState(value);
                };

                buttons.forEach((button, idx) => {
                    const value = Number(button.dataset.ratingValue) || idx + 1;

                    button.dataset.ratingValue = String(value);
                    button.type = 'button';
                    button.setAttribute('role', 'radio');
                    if (!button.hasAttribute('aria-label')) {
                        button.setAttribute('aria-label', `${value} star${value === 1 ? '' : 's'}`);
                    }
                    button.setAttribute('aria-checked', 'false');

                    button.addEventListener('click', () => {
                        setRating(value);
                    });

                    button.addEventListener('mouseenter', () => previewRating(value));
                    button.addEventListener('focus', () => previewRating(value));
                    button.addEventListener('mouseleave', () => previewRating(currentRating));
                    button.addEventListener('blur', () => previewRating(currentRating));

                    button.addEventListener('keydown', (evt) => {
                        let targetIndex = null;

                        switch (evt.key) {
                            case 'ArrowRight':
                            case 'ArrowUp':
                                targetIndex = Math.min(buttons.length - 1, idx + 1);
                                break;
                            case 'ArrowLeft':
                            case 'ArrowDown':
                                targetIndex = Math.max(0, idx - 1);
                                break;
                            case 'Home':
                                targetIndex = 0;
                                break;
                            case 'End':
                                targetIndex = buttons.length - 1;
                                break;
                            case '0':
                            case 'Escape':
                            case 'Backspace':
                            case 'Delete':
                                evt.preventDefault();
                                setRating(0);
                                buttons[0].focus();
                                return;
                            default:
                                return;
                        }

                        evt.preventDefault();
                        const nextValue = targetIndex + 1;
                        buttons[targetIndex].focus();
                        setRating(nextValue);
                    });
                });

                setRating(currentRating);

                list.addEventListener('mouseleave', () => previewRating(currentRating));
            });
        },
        thumbSlider() {
            const slider = $('.thumb-slider');

            if (!slider.length) return;

            const thumbs = $('.thumb-box .slider-dots');

            slider.on('initialized.owl.carousel changed.owl.carousel', function (event) {
                if (!event.namespace) return;

                const carousel = event.relatedTarget;
                const index = carousel.relative(carousel.current());

                thumbs.removeClass('active').eq(index).addClass('active');
            }).owlCarousel({
                loop: true,
                margin: 0,
                nav: true,
                smartSpeed: 500,
                autoplay: false,
                items: 1,
                navText: [
                    "<span class='left-icon arrow-icon'><i class='icon-10'></i></span>",
                    "<span class='right-icon arrow-icon'><i class='icon-11'></i></span>"
                ]
            });

            thumbs.on('click', function () {
                const index = Number($(this).data('slide-index'));
                slider.trigger('to.owl.carousel', [index, 400]);
            });
        },
        activeTimer() {
            function setTimer(el) {
                let endTime = $(el).data('end-time');
                endTime = (Date.parse(endTime) / 1000);
                let now = new Date();
                now = (Date.parse(now) / 1000);
                let timeLeft = endTime - now;
                let days = Math.floor(timeLeft / 86400);
                let hours = Math.floor((timeLeft - (days * 86400)) / 3600);
                let minutes = Math.floor((timeLeft - (days * 86400) - (hours * 3600)) / 60);
                let seconds = Math.floor((timeLeft - (days * 86400) - (hours * 3600) - (minutes * 60)));

                let day = $(el).find('.timer-day')
                let hour = $(el).find('.timer-hour')
                let minute = $(el).find('.timer-minute')
                let second = $(el).find('.timer-second')



                if (hours < "10") { hours = "0" + hours; }
                if (minutes < "10") { minutes = "0" + minutes; }
                if (seconds < "10") { seconds = "0" + seconds; }

                day.find('.value').html(`${days}`);
                hour.find('.value').html(`${hours}`);
                minute.find('.value').html(`${minutes}`);
                second.find('.value').html(`${seconds}`);
            }

            $('.timer').each((index, el) => setInterval(() => setTimer(el), 1000));
        },
        hightlightTitle() {
            $('[data-highlight-position]').each((i, el) => {
                let text = $(el).text().replace(/\s+/g, " ").trim();

                let positions = $(el).data("highlight-position");

                if (!Array.isArray(positions)) {
                    positions = String(positions)
                        .split(/[,|\s]+/)
                        .map(Number)
                        .filter((n) => !isNaN(n));
                }

                let words = text.split(" ");

                let updated = words.map((word, idx) => {
                    let position = idx + 1; // make 1-based
                    if (positions.includes(position)) {
                        return `<span class="text--base">${word}</span>`;
                    }
                    return word;
                });

                $(el).html(updated.join(" "));
            });
        },
        navHorizontal() {

            function horizontalMenuScrolling(element, baseClass = 'nav-horizontal') {
                let prev = $(element).find(`.${baseClass}__btn.prev`);
                let next = $(element).find(`.${baseClass}__btn.next`);
                let menu = $(element).find(`.${baseClass}-menu`);
                let menuItems = $(menu).find(`.${baseClass}-menu__item`);
                let menuItemFirst = $(menu).find(`.${baseClass}-menu__item:first-child`);
                let menuItemLast = $(menu).find(`.${baseClass}-menu__item:last-child`);
                let menuItemTotalWidth = 0;
                let menuScrollLeft = 0;
                let observerOptions = {
                    root: menu[0],
                    rootMargin: '1px',
                    threshold: 1
                }
                console.log(`.${baseClass}__btn.prev`);


                let setIntersectionObserver = function (element, btn) {
                    let observer = new IntersectionObserver((entries) => {
                        entries.forEach(entry => {
                            entry.intersectionRatio >= 1 ? $(btn).removeClass('show') : $(btn).addClass('show');
                        });

                    }, observerOptions);

                    return observer.observe(element);
                }

                menu[0].scrollLeft = 0;

                setIntersectionObserver(menuItemFirst[0], prev[0]);
                setIntersectionObserver(menuItemLast[0], next[0]);

                menuItems.each((index, element) => menuItemTotalWidth += element.scrollWidth);
                menuScrollLeft = Math.floor(menuItemTotalWidth / menuItems.length);

                next.on('click', function () {
                    menu[0].scrollLeft += menuScrollLeft;
                });

                prev.on('click', function () {
                    if (menu[0].scrollLeft === 0) {
                        return;
                    }

                    menu[0].scrollLeft -= menuScrollLeft;
                });
            }

            $('.nav-horizontal').each((index, element) => horizontalMenuScrolling(element));
        },
        inputCopy() {
            $('.input--group-copy').each((index, element) => {
            
                let copyBtn = $(element).find('.copy-btn');
                let copyInput = $(element).find('.copy-input');
            
                copyBtn.on('click', async function () {
            
                    let text = copyInput.val();
            
                    try {
            
                        // Modern clipboard API
                        if (navigator.clipboard && navigator.clipboard.writeText) {
            
                            await navigator.clipboard.writeText(text);
            
                        } else {
            
                            // Fallback
                            copyInput.select();
                            copyInput[0].setSelectionRange(0, 99999);
            
                            document.execCommand('copy');
                        }
            
                        $(this).addClass('copied');
            
                        setTimeout(() => {
                            $(this).removeClass('copied');
                        }, 1000);
            
                    } catch (err) {
                        console.error('Copy failed:', err);
                    }
            
                });
            
            });
        },
        inputPassword() {
            $('.input--group-password').each(function (index, inputGroup) {
                let inputGroupBtn = $(inputGroup).find('.input-group-btn');
                let formControl = $(inputGroup).find('.form-control.form--control');

                inputGroupBtn.on('click', function () {
                    if ($(this).hasClass('toggle-password')) {
                        return;
                    }

                    if (formControl.attr('type') === 'password') {
                        formControl.attr('type', 'text');
                        $(this).find('i').removeClass('fa-eye-slash').addClass('fa-eye');
                    } else {
                        formControl.attr('type', 'password');
                        $(this).find('i').removeClass('fa-eye').addClass('fa-eye-slash');
                    }
                });
            });
        }
    };

    // Exposed so the Next.js router can re-apply the theme after a client-side
    // navigation; every initialiser above is idempotent.
    window.VipuriTheme = {
        init() {
            try {
                config.init();
            } catch (e) {
                console.warn('VIPURI theme init:', e);
            }
        },
        destroySliders() {
            $('.slick-initialized').slick('unslick');
        }
    };

    $(document).ready(function () {
        // Active all function
        config.init()
        // Preloader always in bottom
        $('.preloader').fadeOut()
        // Progress Bar

    })

    // Backward-compat shim for older review scripts
    window.loadMagnificPopup = window.loadMagnificPopup || function () {
        if ($('.lightbox-image').length && $.fn.fancybox) {
            $('.lightbox-image').fancybox({
                openEffect: 'fade',
                closeEffect: 'fade',
                helpers: {
                    media: {}
                }
            });
        }
    };
})(jQuery);
