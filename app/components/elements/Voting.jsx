import React from 'react';
import { connect } from 'react-redux';
import transaction from 'app/redux/Transaction';
// import ReactTooltip from 'react-tooltip';
import Icon from 'app/components/elements/Icon';
import Tooltip from 'app/components/elements/Tooltip';
import Follow from 'app/components/elements/Follow';
import FormattedAsset from 'app/components/elements/FormattedAsset';
import shouldComponentUpdate from 'app/utils/shouldComponentUpdate';
import pluralize from 'pluralize';
import {formatDecimal, parsePayoutAmount} from 'app/utils/ParsersAndFormatters';
import DropdownMenu from 'app/components/elements/DropdownMenu';
import TimeAgoWrapper from 'app/components/elements/TimeAgoWrapper';

const ABOUT_FLAG = 'Flagging or downvoting a post can remove rewards and make this material less visible.  You can still unflag or upvote later if you change your mind.'

class Voting extends React.Component {

    static propTypes = {
        // HTML properties
        post: React.PropTypes.string.isRequired,
        flag: React.PropTypes.bool,

        // Redux connect properties
        vote: React.PropTypes.func.isRequired,
        author: React.PropTypes.string, // post was deleted
        permlink: React.PropTypes.string,
        username: React.PropTypes.string,
        myVote: React.PropTypes.number,
        active_votes: React.PropTypes.object,
        loggedin: React.PropTypes.bool,
        pending_payout: React.PropTypes.string,
        total_payout: React.PropTypes.string,
        cashout_time: React.PropTypes.string,
        showList: React.PropTypes.bool,
        voting: React.PropTypes.bool,
    };

    static defaultProps = {
        showList: true,
        flag: false
    };

    constructor() {
        super()
        this.state = {}
        this.voteUp = e => {
            e.preventDefault();
            if(this.props.voting) return
            this.setState({votingUp: true, votingDown: false})
            const {author, permlink, username, myVote} = this.props
            // already voted Up, remove the vote
            const weight = myVote > 0 ? 0 : 10000
            this.props.vote(weight, {author, permlink, username, myVote})
        }
        this.voteDown = e => {
            e.preventDefault();
            if(this.props.voting) return
            this.setState({votingUp: false, votingDown: true})
            const {author, permlink, username, myVote} = this.props
            // already vote Down, remove vote
            const weight = myVote < 0 ? 0 : -10000
            this.props.vote(weight, {author, permlink, username, myVote})
        }
        this.shouldComponentUpdate = shouldComponentUpdate(this, 'Voting')
    }

    render() {
        const {myVote, active_votes, showList, voting, flag} = this.props;
        const {votingUp, votingDown} = this.state;
        // console.log('-- Voting.render -->', myVote, votingUp, votingDown);
        if(!active_votes) return <span></span>
        // if( payout[0] == '-' ) payout = "0.000 SBD";
        const votingUpActive = voting && votingUp
        const votingDownActive = voting && votingDown

        const down = <Tooltip t={ABOUT_FLAG}>
            <Icon name={votingDownActive ? 'empty' : (myVote < 0 ? 'flag2' : 'flag1')} />
        </Tooltip>
        const classDown = 'Voting__button Voting__button-down' + (myVote < 0 ? ' Voting__button--downvoted' : '') + (votingDownActive ? ' votingDown' : '');

        if (flag) {
            // Remove negitive votes unless full power -1000 (we had downvoting spam)
            const down_votes = active_votes.filter( v => v.get('percent') === -1000 ).size
            return <span className={classDown}>
                {down_votes > 0 && <span className="Voting__button-downvotes">{down_votes}</span>}
                {votingDownActive ? down : <a href="#" onClick={this.voteDown} title="Downvote">{down}</a>}
            </span>;
        }

        const {pending_payout, total_payout, cashout_time} = this.props;
        const pending_payout_value = parsePayoutAmount(pending_payout);
        const total_payout_value = parsePayoutAmount(total_payout);
        let payout = pending_payout_value + total_payout_value;
        if (payout < 0.0) payout = 0.0;

        const up = <Icon name={votingUpActive ? 'empty' : 'chevron-up-circle'} />;
        const classUp = 'Voting__button Voting__button-up' + (myVote > 0 ? ' Voting__button--upvoted' : '') + (votingUpActive ? ' votingUp' : '');

        const payoutItems = [
            {value: 'Pending Payout $' + formatDecimal(pending_payout_value).join('')}
        ];
        if (cashout_time && cashout_time.indexOf('1969') !== 0 && cashout_time.indexOf('1970') !== 0) {
            payoutItems.push({value: <TimeAgoWrapper date={cashout_time} />});
        }
        if(total_payout_value > 0) {
            payoutItems.push({value: 'Past Payouts $' + formatDecimal(total_payout_value).join('')});
        }
        // payoutItems.push({value: 'Author $ ' + formatDecimal(payout * 0.75).join('')});
        // payoutItems.push({value: 'Curators $ ' + formatDecimal(payout * 0.25).join('')});
        const payoutEl = <DropdownMenu el="div" items={payoutItems}>
            <span>
                <FormattedAsset amount={payout} asset="$" />
                <Icon className="dropdown-arrow" name="dropdown-arrow" />
            </span>
        </DropdownMenu>;

        const avotes = active_votes.toJS();
        // sort votes by time, people don't want to see whales constantly on the top
        avotes.sort((b, a) => a.time < b.time ? -1 : a.time > b.time ? 1 : 0)
        let count = 0;
        let voters = [];
        for( let v = 0; v < avotes.length; ++v ) {
            const pct = avotes[v].percent
            // Remove negitive votes unless full power -1000 (we had downvoting spam)
            if(pct < 0 && pct !== -1000)
                continue

            const cnt = Math.sign(pct)
            count += cnt
            if(cnt === 0) continue
            if (showList) voters.push({value: (cnt > 0 ? '+ ' : '- ') + avotes[v].voter, link: '/@' + avotes[v].voter})
        }


        let voters_list = null;
        if (showList) {
            voters_list = <DropdownMenu selected={pluralize('votes', count, true)} className="Voting__voters_list" items={voters} el="div" />;
        }
        return (
            <span className="Voting">
                <span className="Voting__inner">
                    <span className={classUp}>
                        {votingUpActive ? up : <a href="#" onClick={this.voteUp} title={myVote > 0 ? 'Remove Vote' : 'Upvote'}>{up}</a>}
                    </span>
                    {payoutEl}
                    {/*<span className={classDown}>
                        {votingDownActive ? down : <a href="#" onClick={this.voteDown} title="Downvote">{down}</a>}
                    </span>*/}
                </span>
                {voters_list}
            </span>
            );
    }
}

export default connect(
    // mapStateToProps
    (state, ownProps) => {
        const post = state.global.getIn(['content', ownProps.post])
        if (!post) return ownProps
        const author = post.get('author')
        const permlink = post.get('permlink')
        const last_payout = post.get('last_payout')
        const active_votes = post.get('active_votes')
        const username = state.user.getIn(['current', 'username'])
        const voting = state.global.get(`transaction_vote_active_${author}_${permlink}`)
        let myVote = null;
        if (username && active_votes) {
            const vote = active_votes.find(el => el.get('voter') === username && el.get('time') > last_payout)
            // weigth warning, the API may send a string or a number (when zero)
            if(vote) myVote = parseInt(vote.get('percent') || 0, 10)
        }
        return {
            ...ownProps,
            myVote, author, permlink, username, active_votes,
            loggedin: username != null,
            voting
        }
    },

    // mapDispatchToProps
    (dispatch) => ({
        vote: (weight, {author, permlink, username, myVote}) => {
            const confirm = () => {
                if(myVote == null) {
                    if(weight >= 0) return null
                    return <span>
                        <div className="float-right">
                        </div>
                        <h5>{ABOUT_FLAG}</h5>
                        <h5>
                            <Follow follower={username} following={author} showFollow={false}
                                className="float-right" what="blog" />&nbsp;&nbsp;
                            Stop seeing content from this user
                        </h5>
                    </span>
                }
                const t = ' will reset your curation rewards for this post.'
                if(weight === 0) return 'Removing your vote' + t
                if(weight > 0) return 'Changing to an Up-Vote' + t
                if(weight < 0) return 'Changing to a Down-Vote' + t
                return null
            }
            dispatch(transaction.actions.broadcastOperation({
                type: 'vote',
                operation: {voter: username, author, permlink, weight},
                confirm
            }))
        },
    })
)(Voting)
