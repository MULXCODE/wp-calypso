/**
 * External dependencies
 */
import React from 'react';
import { size } from 'lodash';

/**
 * Internal dependencies
 */
import { ConversationCaterpillar } from 'blocks/conversation-caterpillar';
import { posts } from 'blocks/reader-post-card/docs/fixtures';
import { comments, commentsTree } from 'blocks/conversation-caterpillar/docs/fixtures';
import Card from 'components/card';

const ConversationCaterpillarExample = () => {
	return (
		<div className="design-assets__group">
			<Card>
				<ConversationCaterpillar
					comments={ comments }
					blogId={ 123 }
					postId={ 12 }
					commentsTree={ commentsTree }
					commentCount={ size( comments ) }
					commentsToShow={ {} }
					expandComments={ () => {} }
				/>
			</Card>
		</div>
	);
};

ConversationCaterpillarExample.displayName = 'ConversationCaterpillar';

export default ConversationCaterpillarExample;
