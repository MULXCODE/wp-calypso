/**
 * External dependencies
 */
import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import Gridicon from 'gridicons';
import { clamp, inRange, range, round } from 'lodash';
import classNames from 'classnames';

/**
 * Internal dependencies
 */
import Button from 'components/button';

const MIN_CELL_WIDTH = 240; // px
const SIDE_PANE_RATIO = 0.12; // 12% of full width
const MIN_PLAN_OPACITY = 0.4;
const NO_SCROLL_PADDING = 20; // will appear when plans show up without scrolling

export default class PlanFeaturesScroller extends PureComponent {
	static propTypes = {
		planCount: PropTypes.number.isRequired,
		initialSelectedIndex: PropTypes.number.isRequired,
	};

	static defaultProps = {
		planCount: 0,
		initialSelectedIndex: 0,
	};

	scrollWrapperDOM = null;
	initialized = false;

	state = {
		viewportWidth: 0,
		scrollPos: 0,
		scrollSnapDisabled: false,
	};

	componentDidMount() {
		if ( typeof window !== 'undefined' ) {
			window.addEventListener( 'resize', this.handleWindowResize );
		}
		this.scrollWrapperDOM.addEventListener( 'scroll', this.handleScroll );
		this.updateViewportWidth();
	}

	componentWillUnmount() {
		if ( typeof window !== 'undefined' ) {
			window.removeEventListener( 'resize', this.handleWindowResize );
		}
		this.scrollWrapperDOM.removeEventListener( 'scroll', this.handleScroll );
	}

	setWrapperRef = element => {
		this.scrollWrapperDOM = element;
	};

	scrollLeft = event => {
		event.preventDefault();
		event.stopPropagation();
		this.scrollBy( -1 );
	};

	scrollRight = event => {
		event.preventDefault();
		event.stopPropagation();
		this.scrollBy( 1 );
	};

	scrollBy( direction ) {
		if ( this.state.scrollSnapDisabled ) {
			return;
		}

		const { cellWidth, borderSpacing, visibleIndex } = this.computeStyleVars();
		const from = this.scrollWrapperDOM.scrollLeft;
		const to = round( ( visibleIndex + direction ) * ( cellWidth + borderSpacing ) );

		// Workaround: Chrome has a bug to not set the exact scrollLeft value
		// when scroll-snap is turned on.
		this.setState( { scrollSnapDisabled: true }, async () => {
			await this.animateScroll( from, to );
			this.setState( { scrollSnapDisabled: false }, () => {
				this.scrollWrapperDOM.scrollLeft = to;
			} );
		} );
	}

	animateScroll( from, to ) {
		const step = ( to - from ) / 200;
		let startTime = null;

		return new Promise( resolve => {
			const animate = timestamp => {
				if ( ! startTime ) {
					startTime = timestamp;
				}

				let nextPos = from + ( timestamp - startTime ) * step;
				nextPos = step < 0 ? Math.max( nextPos, to ) : Math.min( nextPos, to );
				this.scrollWrapperDOM.scrollLeft = nextPos;

				if ( nextPos !== to ) {
					window.requestAnimationFrame( animate );
				} else {
					window.requestAnimationFrame( resolve );
				}
			};

			window.requestAnimationFrame( animate );
		} );
	}

	handleWindowResize = () => {
		cancelAnimationFrame( this.updateViewportWidthRaf );
		this.updateViewportWidthRaf = window.requestAnimationFrame( this.updateViewportWidth );
	};

	handleScroll = () => {
		cancelAnimationFrame( this.updateScrollPositionRaf );
		this.updateScrollPositionRaf = window.requestAnimationFrame( this.updateScrollPosition );
	};

	updateViewportWidth = () => {
		this.updateViewportWidthRaf = null;
		this.setState( { viewportWidth: this.scrollWrapperDOM.offsetWidth }, () => {
			if ( this.initialized ) {
				this.scrollBy( 0 );
				return;
			}

			const { initialSelectedIndex, planCount } = this.props;
			const { visibleCount } = this.computeStyleVars();
			const [ minIndex, maxIndex ] = [ 0, planCount - visibleCount ];
			let index = 0;

			if ( planCount > visibleCount ) {
				index = clamp( round( initialSelectedIndex - visibleCount / 2 ), minIndex, maxIndex );
			}

			this.scrollBy( index );
			this.initialized = true;
		} );
	};

	updateScrollPosition = () => {
		this.updateScrollPositionRaf = null;
		this.setState( { scrollPos: this.scrollWrapperDOM.scrollLeft } );
	};

	getTableBorderSpacing() {
		if ( ! this.scrollWrapperDOM ) {
			return 0;
		}

		const table = this.scrollWrapperDOM.querySelector( '.plan-features__table' );
		if ( ! table ) {
			return 0;
		}

		const compStyles = window.getComputedStyle( table );
		if ( ! compStyles ) {
			return 0;
		}

		return parseInt( compStyles.getPropertyValue( 'border-spacing' ) ) || 0;
	}

	computeStyleVars() {
		const { viewportWidth: vpw, scrollPos } = this.state;
		const { planCount } = this.props;
		const borderSpacing = this.getTableBorderSpacing();
		let styleWeights = null;
		let paneWidth = '0';
		let visibleCount = planCount;
		let visibleIndex = 0;
		let cellWidth =
			( vpw - borderSpacing * ( visibleCount + 1 ) - NO_SCROLL_PADDING * 2 ) / visibleCount;
		let scrollerWidth = 'auto';
		let scrollerPadding = NO_SCROLL_PADDING;

		if ( vpw && cellWidth < MIN_CELL_WIDTH ) {
			cellWidth = ( vpw - borderSpacing * ( visibleCount + 1 ) ) / visibleCount;

			do {
				visibleCount--;
				cellWidth = ( vpw * ( 1 - SIDE_PANE_RATIO * 2 ) ) / visibleCount - borderSpacing;
			} while ( cellWidth < MIN_CELL_WIDTH );

			paneWidth = SIDE_PANE_RATIO * vpw;
			scrollerWidth = ( cellWidth + borderSpacing ) * planCount + borderSpacing;
			scrollerPadding = `0 ${ paneWidth - borderSpacing / 2 }px`;
			visibleIndex = round( scrollPos / ( cellWidth + borderSpacing ) );

			styleWeights = range( 0, planCount ).map( index => {
				const pos = index - scrollPos / ( cellWidth + borderSpacing );

				if ( inRange( pos, -0.5, visibleCount - 0.5 ) ) {
					return 1;
				}

				if ( pos <= -1 || pos >= visibleCount ) {
					return 0;
				}

				return ( pos <= 0 ? pos + 1 : 1 - ( pos % 1 ) ) * 2;
			} );
		}

		return {
			cellWidth,
			paneWidth,
			scrollerWidth,
			scrollerPadding,
			borderSpacing,
			visibleCount,
			visibleIndex,
			styleWeights,
			showIndicator: planCount > visibleCount,
		};
	}

	renderStyle( { styleWeights, visibleIndex, visibleCount } ) {
		const { cellSelector, planCount } = this.props;

		if ( ! styleWeights ) {
			return null;
		}

		return (
			<>
				{ styleWeights.map( ( weight, index ) => {
					const selector = `${ cellSelector }:nth-child(${ index + 1 })`;
					const opacity = round( weight * ( 1 - MIN_PLAN_OPACITY ) + MIN_PLAN_OPACITY, 2 );
					let translateX = inRange( weight, 0, 1 ) ? ( 1 - weight ) * 5 : 0;

					if ( translateX && index < visibleIndex ) {
						translateX = -translateX;
					}

					const transform = translateX ? `transform: translateX( ${ translateX }% );` : '';
					const border =
						! transform && planCount > visibleCount && index > visibleIndex
							? 'border-left: 0;'
							: '';

					return (
						<style key={ selector }>
							{ `${ selector } { opacity: ${ opacity }; ${ border } ${ transform } }` }
						</style>
					);
				} ) }
			</>
		);
	}

	renderIndicator( { showIndicator, visibleCount, visibleIndex } ) {
		const dotClass = 'plan-features__scroll-indicator-dot';
		const start = visibleIndex;
		const end = start + visibleCount;

		if ( ! showIndicator ) {
			return null;
		}

		return (
			<div className="plan-features__scroll-indicator">
				{ range( 0, this.props.planCount ).map( index => (
					<span
						key={ index }
						className={ classNames( dotClass, { 'is-highlighted': inRange( index, start, end ) } ) }
					/>
				) ) }
			</div>
		);
	}

	render() {
		const { children, planCount } = this.props;

		const vars = this.computeStyleVars();
		const disabledLeft = 0 === vars.visibleIndex;
		const disabledRight = planCount === vars.visibleIndex + vars.visibleCount;
		const containerClass = classNames( 'plan-features__scroller-container', {
			'scroll-snap-enabled': ! this.state.scrollSnapDisabled,
		} );

		return (
			/* eslint-disable jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */
			<div className={ containerClass }>
				<style>{ `.signup__step.is-plans { overflow-x: hidden; }` }</style>
				{ this.renderStyle( vars ) }
				<div
					className={ classNames( 'plan-features__scroll-left', { disabled: disabledLeft } ) }
					style={ { width: vars.paneWidth } }
					onClick={ this.scrollLeft }
				>
					<Button
						className="plan-features__scroll-button"
						disabled={ disabledLeft }
						onClick={ this.scrollLeft }
						tabIndex="0"
					>
						<Gridicon icon="arrow-left" size={ 24 } />
					</Button>
				</div>
				<div
					className="plan-features__scroller-wrapper"
					style={ { scrollPaddingLeft: vars.paneWidth + vars.borderSpacing / 2 } }
					ref={ this.setWrapperRef }
				>
					<div
						className="plan-features__scroller"
						style={ { width: vars.scrollerWidth, padding: vars.scrollerPadding } }
					>
						{ children }
					</div>
				</div>
				<div
					className={ classNames( 'plan-features__scroll-right', { disabled: disabledRight } ) }
					style={ { width: vars.paneWidth } }
					onClick={ this.scrollRight }
				>
					<Button
						className="plan-features__scroll-button"
						disabled={ disabledRight }
						onClick={ this.scrollRight }
					>
						<Gridicon icon="arrow-right" size={ 24 } />
					</Button>
				</div>
				{ this.renderIndicator( vars ) }
			</div>
			/* eslint-enable jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */
		);
	}
}
