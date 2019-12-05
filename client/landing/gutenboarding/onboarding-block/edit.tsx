/**
 * External dependencies
 */
import { __ as NO__ } from '@wordpress/i18n';
import { useSelect } from '@wordpress/data';
import React from 'react';
import { Button } from '@wordpress/components';

/**
 * Internal dependencies
 */
import { STORE_KEY } from '../stores/onboard';
import StepperWizard from './stepper-wizard';
import VerticalSelect from './vertical-select';
import SiteTitle from './site-title';
import './style.scss';

export default function OnboardingEdit() {
	const { siteVertical, siteTitle } = useSelect( select => select( STORE_KEY ).getState() );

	return (
		<div className="onboarding-block__acquire-intent">
			<div
				className="onboarding-block__background"
				data-vertical={ siteVertical && siteVertical.id }
			/>

			<div className="onboarding-block__questions">
				<h2 className="onboarding-block__questions-heading">
					{ ! siteVertical &&
						! siteTitle &&
						NO__( "Let's set up your website – it takes only a moment." ) }
				</h2>
				<StepperWizard>
					<VerticalSelect />
					{ ( siteVertical || siteTitle ) && <SiteTitle /> }
				</StepperWizard>
				{ siteVertical && (
					<div className="onboarding-block__footer">
						<Button className="onboarding-block__question-skip" isLink>
							{ NO__( "Don't know yet" ) } →
						</Button>
					</div>
				) }
			</div>
		</div>
	);
}
