// import { Helper } from "./typeHelper";
import { ref } from "vue";

interface NetworkAddress{
  isPassed: boolean,
  errMessage: string
}

export class AddressBookUtils {

  static verifyNetworkAddressEqualsNetwork(currentPrimaryAdd:string, add:string):boolean {
    const c1 = currentPrimaryAdd ? currentPrimaryAdd.trim().toUpperCase().replace(/-/g, '') : '';
    const c2 = add ? add.trim().toUpperCase().replace(/-/g, '') : '';
    if (c1.length === 40 && c2.length === 40) {
      if (c1.charAt(0) === 'S' && c2.charAt(0) === 'S') {
        // NetworkType.MIJIN_TEST
        return true;
      } else if (c1.charAt(0) === 'M' && c2.charAt(0) === 'M') {
        // NetworkType.MIJIN
        return true;
      } else if (c1.charAt(0) === 'V' && c2.charAt(0) === 'V') {
        // NetworkType.TEST_NET
        return true;
      } else if (c1.charAt(0) === 'X' && c2.charAt(0) === 'X') {
        // NetworkType.MAIN_NET
        return true;
      } else if (c1.charAt(0) === 'W' && c2.charAt(0) === 'W') {
        // NetworkType.PRIVATE_TEST
        return true;
      } else if (c1.charAt(0) === 'Z' && c2.charAt(0) === 'Z') {
        // NetworkType.PRIVATE
        return true;
      } else {
        // Address Network unsupported
        return false;
      }
    }
    return false;
  }

  static verifyNetworkAddress(currentAdd:string, add:string): NetworkAddress {
    const address = (add !== undefined && add !== null && add !== '') ? add.trim().replace(/-/g, '') : '';

    let verification: NetworkAddress = {
      isPassed: false,
      errMessage: ''
    };

    if (address.length === 40) {
      if(this.verifyNetworkAddressEqualsNetwork(currentAdd, address)){
        verification.isPassed =  true;
      }else{
        verification.isPassed = false;
        verification.errMessage = 'Recipient Address Network unsupported';
      }
    }else{
      verification.isPassed = false;
    }
    return verification;
  }
}