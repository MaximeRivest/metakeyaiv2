# normal simple user journey

> note: c and m early mean control and meta which is alt

## Translating text and possible path to do a thing

Imagine a user want to search google, they speak only english, but they want to learn from japanese blog posts and culture. They would do c-m-w and start talking, c-m-w again and what they said would be in their clipboard, then they would hit c-m-t and a windows would pop up telling them to mention the target language, they woud say: japanese and hit enter and their clipboard would now contain what they said but in japanese. Ready to paste in the search bar.

They could have also done c-m-x and a thing would have popup saying: give me or describe the command that you want. they would have said: I want to translate clipboard content to japanese. Enter and the content would have been translated. If they do enter is a prompt if they do c-m-x again it create a new spell, where they next have to pick a keyboard shortcut (if they want) it is selectable from the spell book with arrow navigation upon c-m-s otherwise. 

c-m-s turn on spell book navigation, with arrows and enter and tabs, it's also where the settings can we opened. all from the keyboard. at any point, c-m-z can be used to use voice instead of keyboard shortcut by saying to keyboard shortcut, can be many in a sequence.

## Reading text

On that user landed on a search page with many Japanese links they want it translated back to english. So they do ctrl-a ctrl-c c-m-t and a window would pop up telling them to metion the target language, they could type or talk to their mic and say english. hit enter and after a bit of ai processing the clipboard would contain the translated page. to view that nicely in a big page they would do c-m-c this pop up a big minimalistic window markdown page where they can read the content of the clipboard and even edit it. esc would live and close small without editing, c-s would save it and c-a c-c esc would add the whole content of the edited clipboard into a clipboard database and not change the current one (as should be expected from ctrl-a ctrl-c and as I just specified from esc, thing compose well). 

Wether in c-m-c big view and edit mode or not the user can cycle through clipboard and track of clipboard and can set default track to receive the c-c and if using c-C (shift -c ) they would say or type the name of the track (usually type its faster but still) and navigate the hud with up or down arrow and hit enter. and the content would now be in that track. Using c-m-s and and then t the user would get in the track settings in the overlay where they can navigate with arrows, tabs, delete and enter (or the mouse) to reorder track, delete track rename tracks, enter tracks and delete clipboards.

After they translated the content into english the user could have done c-m-e and an echo (a tts) of the task would have started, at any time the user could do c-m-s e + or - to change the reading speed c-m-s opens the settings, e goes to echoes + or - change speed and esc cancel the changes enter saves them (both leaves the settings and edit mode of the overlay).

## Editing text

User Journey: Voice-Driven Editing and AI Assistance
I’m working on a document—maybe in Word or Google Docs. When I want to add new content, I press CTRL-META-W to bring up a voice input pop-up. I start talking, sharing my ideas or story out loud. When I’m finished, I press CTRL-META-W again to stop recording. The system transcribes my speech and puts it into my clipbaord. I can simply paste the text into my document.

As I review my draft, I notice sentences or words that could be improved. I press CTRL-ALT-W to start another round of speech-to-text, speaking out my suggestions—maybe a word to change or a sentence to shorten. I end the recording with CTRL-ALT-W, and my comments appear in clipboard ready for me to paste within double exclamation marks (!!) wherever I want the AI to notice them as a comment.

Once my feedback is in place, I select the whole passage (using CTRL-A or the mouse or any other way), then press CTRL-ALT-P to trigger the AI proofread spell. The AI reviews both the text based on my in-line comments, returning an improved version, ready for me to paste right back into the document.

If I want to make a specific suggestion—like improving just the second paragraph—I can select that section, copy it, and use a special command (maybe CTRL-SHIFT-ALT-P). The system will prompt me for extra context if needed, and I can provide more details before the AI processes the request (by copy pasting the whole text for instance).

An additionnal thing I could do is taht I could select the whole text and ask to change the second paragraph (notice I did not cast a spell on only the text of the second paragraph with added context (c-m-P) I simply cast c-m-p on the clipboard that contained the whole text but when I do c-m-p and voice input pops up (as described before) this time I tell it to edit something in paragraph 2 and paragraph 7. This is sent to an AI workflow. When the new version comes back, if I select the whole text again (highlight it) the edit/view clipboard overlay opens up in edit mode and shows me a smart diff view: added text in green, removed text in red, and unchanged text as usual. I can start editing the text myself (it will follow the same coloring) if I put back existing character it will be normal color, I remove it would be red add it woulb be green. If I hit c-enter the text in put in place of the previouse text. The cool thing here is the the AI answer and the selected text is aligned and match and only corresponding matches are replaced. So for instance if the ai return some stuff to talk to me the user and if I selected only one of the 2 paragraph that are in my clipboard on that one would be in the popping up view/editor. if I I have selected the whole text but receive only 2 small snippert, those would be found and only those would be worked on / confirmed in the editor and replace once I prese c-enter. 


Another thing the would happend is that I could add in a paragraph some thing like !! verify that information!!. And correct or cite, then knowing this is information avaibable in a pdf I have and not only, I would want to add that as an attachement. To do that, I would select the section of text I am working on, then do c-m-P in the opening window I would do @a to include the whole text from ctrl-a of the current document for the ai to have that as context but instead of hitting enter there I would would do @ again and start searching of the document in my computer. In the setting c-m-s a the user can set directory to index and some functions on how to index those attachments. Let's say this was already index I can then type and it would de a fuzzy search in the name, if I do @@ and type stuff it would do semantic search on content of documents, and then with the up down arrow and pick the file and enter to select it, and at this point no more context. If I want that context 'recipe' to be the new default for next paragraph I can do ctrl-s before enter to sent the spell. It would be editable next time, but prefilled with a new ctr-a and the same pdf. 

#persona

Let's say now that I want to do data analytics in excel. I could do c-m-s p and using the arrow I could choose the excel personna and hit enter, at the point a specific set of spell and their associated keyboard shortcuts would be what I see in the hud overlay.

Say I have some data with vegetable names in one column, there price in another in lbs. but now I want there price in kg, I could do c-m-f (for formula or maybe c-m-=) and a pop up for voice input telling me to say what do I want the formula to do, then I would say: I want to transform the number in the column F on the same row from lbs to kg. Then press enter and I would receive the formulay and just it in the clipboard, I would then paste it and drag it done. Now I would like to correct any rows that has a typo, so I would select the top element in the my and I would do c-m-l (for loop) and a voice popup would appear and tell me what is the question/action I want to do I would say: correct the text if typos, target these, x,y,z no capitals underscore for spaces, then I would hit enter and it would tell me: what is the keyboard sequence to do to loop, I would type: done arrow, and it would ask, how do I know when to stop: upon after 5 consecutive empty rows. Then I would hit enter and it would send the value of the cell to an ai for correction pasting the response if different and looping until stoping condition were found.

in some cases, normal python code could be bound to a keyboard shortcut and not even call the ai.


## help finding stuff

If I have navigating though my os and I have a folder selected, I could do c-m-f and a voice input signal would light up I would say what I am looking for and hit enter and if not already loading the the duckdb attachments database and indexe and embedded taht would happen and at some point I would get the file path and position of relevant content in my clipboard in a track for that (while it works on it I would see it in the overlay dashboard).

## merging clipboards and using tracks

doing ctrl-alt-n (or insert or anything else custom picked by user) would creat a new clipboard track and set it, I could then go and paste files from my file navigator like: click on file once, c-C to 'render it' with attaachments python library instead of juste copying the name of the paste, and then select another and do c-C again and then write something and c-c it and then select a snippet of a paragraph in a website and then I could do c-m-M and all clipboards would merged into one and I could do c-m-x and ask my question of give my task, and I would get the results in my AI results clipboard track with it's ready (not sure about this, I know I want to be able to send the stuff async but should they land on AI reserved track, in the track that was set when launched or in the current track, should be an option.)


