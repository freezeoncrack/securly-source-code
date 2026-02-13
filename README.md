# source
contains every extension source code from the securly extensions that I know of (anything in my school’s update manifest) | I made this so people can reverse engineer this and find some concerns about privacy in it so we can take this shit spyware out of our schools. I have no time to look through the source, so I’m hoping others can look through it.

## useful URLs
https://cdn1.securly.com/pmatch.json  
https://cdn1.securly.com/config.json  
https://crextnaut.securly.com/ (idk, that’s a source URL for the manifest)

# how I got it
the lockdown browser on Chrome provides a “system check” which provides a log file about the whole computer (lucky enough for us it provides info about Securly), including Securly’s update manifest, which is how I found it. Pretty easy, but I can’t seem to find any other repo with this source (shoutout to https://github.com/Src-Skol/securly-for-chromebooks, but it’s not really explanatory and is kinda shit, which is why I made this). So anyways, that’s how I found it, and I’ll take some bug bounty money, Securly, if you find this.

# my finding
https://cdn1.securly.com/config.json#proxyIdentification seems to have a personal vendetta against proxies, because, you know, it’s this shit. So I feel bad for the proxy devs. Anyways, that’s all I wanted to tell you. Auf Wiedersehen.
