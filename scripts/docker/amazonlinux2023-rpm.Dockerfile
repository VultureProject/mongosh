FROM amazonlinux:2023

# On RHEL9 and based-distros, an additional configuration option
  # `rh-allow-sha1-signatures` is present which is not recognizable to the
  # OpenSSL version bundled with Node.js and hence the mongosh binary fails to
  # run. Explicitly on those hosts we disable effect of --openssl-shared-config
  # flag which is pushed by boxednode when bundling Node.js
ENV OPENSSL_CONF=""

ARG artifact_url=""
ADD ${artifact_url} /tmp
ADD node_modules /usr/share/mongodb-crypt-library-version/node_modules
RUN yum repolist
RUN yum install -y /tmp/*mongosh*.rpm
RUN /usr/bin/mongosh --build-info
RUN env MONGOSH_RUN_NODE_SCRIPT=1 mongosh /usr/share/mongodb-crypt-library-version/node_modules/.bin/mongodb-crypt-library-version /usr/lib64/mongosh_crypt_v1.so | grep -Eq '^mongo_(crypt|csfle)_v1-'
ENTRYPOINT [ "mongosh" ]
