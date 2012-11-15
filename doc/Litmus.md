# Using Litmus with the WebDAV Proxy

Litmus is a suite of WebDAV tests authored by the Apache mod_dav
community. It serves two purposes:

- Verify that a given WebDAV implementation adheres to the standard.
- Ensure that certain regressions do not re-appear in mod_dav.

Litmus is useful to us because of that first goal.

## Installing Litmus

To install Litmus you must build it from the source. The source and
detailed instructions can be found at the official [Litmus
site](http://www.webdav.org/neon/litmus/).

Typically, the installation process is done by issuing
`./configure && make && make install`. However, you should consult the
instructions provided in the dowloaded package.

## Running Litmus

To run Litmus against the proxy, there are a few initial steps. First,
because Litmus requires a space that allows all WebDAV operations, we
must provide it with a container. (Objects at and above the container
level are subject to strict permissions.)

To do this, you should log into your [HP Cloud
account](https://console.hpcloud.com) and create a new container named
`Litmus` in the region of your choice. Make sure your proxy is also
pointing to that same region.

Next, you can execute Litmus at the command line like this:

```
$ litmus http://localhost:8000/12345678/Litmus/ myname mypassword
``` 

*Replace* the tenant ID (first part of the path) and the container
name (second part of the path) in the URL.

*Replace* the username and password with your username and password.
Unfortunately, Litmus requires that these values be placed on the
command line, though for security reasons you may prefer to use
environment variables.

You can prefix the `litmus` command with an environment variable
declaring which tests you want to run using `TESTS=testname`.

Once you run Litmus, it will execute a long series of tests. The output
will look something like this:

```
$ TESTS=locks litmus http://localhost:8000/12345678/Litmus/ myname mypassword
-> running `locks':
 0. init.................. pass
 1. begin................. pass
 2. options............... pass
 3. precond............... pass
 4. init_locks............ pass
 5. put................... pass
 6. lock_excl............. pass
 7. discover.............. pass
 8. refresh............... pass
 9. notowner_modify....... pass
10. notowner_lock......... pass
11. owner_modify.......... pass
12. notowner_modify....... pass
13. notowner_lock......... pass
14. copy.................. pass
15. cond_put.............. FAIL (PUT conditional on lock and etag failed: 423 Locked)
16. fail_cond_put......... WARNING: PUT failed with 423 not 412
    ...................... pass (with 1 warning)
17. cond_put_with_not..... pass
18. cond_put_corrupt_token pass
19. complex_cond_put...... FAIL (PUT with complex conditional failed: 423 Locked)
20. fail_complex_cond_put. FAIL (PUT with complex bogus conditional should fail with 412: 423 Locked)
21. unlock................ pass
22. fail_cond_put_unlocked FAIL (conditional PUT with invalid lock-token should fail: 204 No Content)
23. lock_shared........... FAIL (requested lockscope not satisfied!  got shared, wanted exclusive)
24. notowner_modify....... SKIPPED
25. notowner_lock......... SKIPPED
26. owner_modify.......... SKIPPED
27. double_sharedlock..... SKIPPED
28. notowner_modify....... SKIPPED
29. notowner_lock......... SKIPPED
30. unlock................ SKIPPED
31. prep_collection....... pass
32. lock_collection....... pass
33. owner_modify.......... pass
34. notowner_modify....... FAIL (DELETE of locked resource should fail)
35. refresh............... pass
36. indirect_refresh...... FAIL (indirect refresh LOCK on /18552685588712/Litmus/litmus/lockcoll/ via /18552685588712/Litmus/litmus/lockcoll/lockme.txt: 400 Bad Request)
37. unlock................ pass
38. unmapped_lock......... pass
39. unlock................ pass
40. finish................ pass
-> 7 tests were skipped.
<- summary for `locks': of 34 tests run: 27 passed, 7 failed. 79.4%
-> 1 warning was issued.
See debug.log for network/debug traces.
```

