# instaharvestor

This is a utility to grab referenced accounts that fit certain criteria from instagram influencers.

## usage

```
npm i    # install dependencies
npm test # run the script and output CSV to stdout.
```

Add your rules & influencers to text files in `settings/`, 1 item per line:

```
influencers     - people who link to the instagram users you want info from
rules_notprefix - things that should not appear before a username
rules_preceding - things that should appear before a username
rules_username  - things that if found in username, match
```

Make sure you set `INSTAGRAM_USER` and `INSTAGRAM_PASSWORD` environment variables.