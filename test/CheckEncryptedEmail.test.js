const assert = require('assert');
const webdriver = require('selenium-webdriver'),
  By = webdriver.By,
  until = webdriver.until,
  Builder = webdriver.Builder;
const EMAIL = ''; // Enter gmail credentials
const PASS = ''; // here


describe('Check Encrypted Email End2End Test', ()=> {
  let driver;
  const subject = "Encrypted Email"; // Enter the Subject of Email to check
  const text = "Secret message"; // Enter the text of encrypted message

  before(async()=> {
    driver = await new Builder().forBrowser(process.env.SELENIUM_BROWSER).build(); // process.env.SELENIUM_BROWSER is used to choose any browser from command line. For example: 'SELENIUM_BROWSER=chrome npm test'
  });

  after(async()=> {
    await driver.quit();
  });

  it('Login', async()=> {
    await driver.get('https://accounts.google.com/signin/v2/identifier?flowName=GlifWebSignIn&flowEntry=ServiceLogin&continue=https%3A%2F%2Fmail.google.com%2Fmail%2F');
    await driver.findElement(By.id('identifierId')).sendKeys(EMAIL);
    await driver.findElement(By.id('identifierNext')).click();
    await driver.wait(until.elementLocated(By.id('profileIdentifier')),6000);
    await driver.executeScript("document.querySelectorAll('#password input')[0].value='"+PASS+"'"); // Need to use 'executeScript' because Google blocks the input element for some reason and WebDriver throws excpetion: ElementNotInteractableException: Element is not reachable by keyboard
    await driver.sleep(1000); // Without this wait - Google will return 405 error
    let el = await driver.findElement(By.id('passwordNext'));
    await driver.executeScript("arguments[0].click();", el); // The same problem as with the input Password field. Exception: element is not clickable at point
    const result = await driver.wait(until.urlIs('https://mail.google.com/mail/u/0/#inbox'));
    assert.ok(result, 'Login failed');
  }).timeout(60000);

  it('Open Encrypted Email', async()=>{
    let subjects = await driver.findElements(By.css('span.bog'));
    let firstHandle = await driver.getWindowHandle();
    for (var i in subjects){ // Loop through first 50 subjects to find target email
      if (await subjects[i].getText() == subject){
        await subjects[i].click();
        let el = await driver.wait(until.elementLocated(By.linkText('Unlock Message')),15000);
        el.click();
        await driver.sleep(1000); // Without this wait - webdriver does not want to count the second Window
        let allHandles = await driver.getAllWindowHandles(); // Unobviously WebDriver does not want to automatically switch on active window
        for (var i in allHandles){ // So we need to switch the webdriver on the second tab manually (Yes even if this tab is active)
          if (allHandles[i] != firstHandle){
            driver.switchTo().window(allHandles[i]);
            break;
          };
        };
        el = await driver.wait(until.elementLocated(By.className('userEmail')),25000);
        el.click();
        el = await driver.wait(until.elementLocated(By.className('oauth-provider-google')),15000);
        el.click();
        const preview = await driver.wait(until.elementLocated(By.className('preview email')),25000);
        assert.ok(preview,'Preview is not shown');
        break;
      };
    };
  }).timeout(60000);

  it('Check Decrypted Text', async()=>{
    await driver.sleep(500); // Without this wait - textDiv.getText() will return empty string astably. I still don't understand what the reason. I guess the element can be changed after page is loaded   
    let textDiv = await driver.findElement(By.css('#tdf-body div'));
    assert.equal(await textDiv.getText(),text);
  });
});
